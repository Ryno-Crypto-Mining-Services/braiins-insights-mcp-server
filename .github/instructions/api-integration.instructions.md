# API Integration Best Practices

**Location**: `.github/instructions/api-integration.instructions.md`

---

## Braiins Pool REST API

### Authentication & Headers

```typescript
class BraiinsPoolAPI {
  private readonly apiKey: string;
  private readonly baseUrl = "https://api.braiins.com/v2";

  constructor(apiKey: string) {
    if (!apiKey || !apiKey.startsWith("sk_")) {
      throw new Error("Invalid API key format. Must start with 'sk_'");
    }
    this.apiKey = apiKey;
  }

  private buildHeaders(): HeadersInit {
    return {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "braiins-insights-mcp/1.0.0"
    };
  }

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: this.buildHeaders()
      });

      if (!response.ok) {
        throw new APIError(
          response.status,
          response.statusText,
          await response.text()
        );
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new NetworkError(`Request failed: ${error.message}`);
    }
  }
}
```

### Key Endpoints

#### 1. Pool Statistics

```typescript
async getPoolStats(poolId: string): Promise<PoolStatsResponse> {
  return this.fetch<PoolStatsResponse>(
    `/pools/${poolId}/stats`
  );
}

interface PoolStatsResponse {
  pool_id: string;
  name: string;
  status: "active" | "inactive";
  total_hashrate_ths: number;
  worker_count: number;
  last_block_found_time: string; // ISO 8601
  estimated_24h_revenue_btc: number;
  estimated_30d_revenue_btc: number;
  difficulty_current: number;
  difficulty_next: number;
  pool_fee_percent: number;
}
```

#### 2. Account Data

```typescript
async getAccountDetails(accountId: string): Promise<AccountData> {
  return this.fetch<AccountData>(
    `/accounts/${accountId}`
  );
}

interface AccountData {
  account_id: string;
  username: string;
  created_at: string; // ISO 8601
  confirmed_balance_btc: number;
  pending_balance_btc: number;
  total_earned_btc: number;
  last_payout_date: string;
  payout_frequency: "daily" | "weekly" | "monthly";
}
```

#### 3. Payout History

```typescript
async getPayouts(
  poolId: string,
  limit: number = 30,
  offset: number = 0
): Promise<PayoutHistoryResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString()
  });
  
  return this.fetch<PayoutHistoryResponse>(
    `/pools/${poolId}/payouts?${params}`
  );
}

interface PayoutHistoryResponse {
  total_count: number;
  payouts: {
    payout_id: string;
    date: string; // ISO 8601
    amount_btc: number;
    confirmed: boolean;
    transaction_id: string;
  }[];
}
```

#### 4. Worker/Miner List

```typescript
async getWorkers(poolId: string): Promise<WorkersResponse> {
  return this.fetch<WorkersResponse>(
    `/pools/${poolId}/workers`
  );
}

interface WorkersResponse {
  workers: {
    worker_id: string;
    name: string;
    model: string;
    status: "online" | "offline" | "disabled";
    current_hashrate_ths: number;
    shares_valid: number;
    shares_stale: number;
    shares_invalid: number;
    last_seen: string; // ISO 8601
  }[];
}
```

### Error Handling

```typescript
class APIError extends Error {
  constructor(
    public statusCode: number,
    public statusText: string,
    public responseBody: string
  ) {
    super(`API Error ${statusCode}: ${statusText}`);
  }

  isAuthError(): boolean {
    return this.statusCode === 401 || this.statusCode === 403;
  }

  isRateLimited(): boolean {
    return this.statusCode === 429;
  }

  isNotFound(): boolean {
    return this.statusCode === 404;
  }

  isServerError(): boolean {
    return this.statusCode >= 500;
  }
}

class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

// Usage in tool
try {
  const stats = await api.getPoolStats(poolId);
  return stats;
} catch (error) {
  if (error instanceof APIError) {
    if (error.isAuthError()) {
      return errorResponse("Invalid API key. Check BRAIINS_POOL_API_KEY.");
    }
    if (error.isNotFound()) {
      return errorResponse(`Pool '${poolId}' not found.`);
    }
    if (error.isRateLimited()) {
      return errorResponse("Rate limited. Please try again in 1 minute.");
    }
    return errorResponse(`API error: ${error.statusText}`);
  }
  if (error instanceof NetworkError) {
    return errorResponse("Network error. Check your connection.");
  }
  return errorResponse(`Unexpected error: ${error.message}`);
}
```

### Rate Limiting & Retry Strategy

```typescript
interface RateLimitInfo {
  limit: number;           // Max requests per minute
  remaining: number;       // Requests remaining
  resetTime: Date;        // When limit resets
}

class RateLimitedAPI {
  private rateLimitInfo: RateLimitInfo | null = null;

  async fetch<T>(endpoint: string): Promise<T> {
    // Check if we're rate limited
    if (this.rateLimitInfo?.remaining === 0) {
      const waitMs = this.rateLimitInfo.resetTime.getTime() - Date.now();
      throw new RateLimitError(
        `Rate limited. Retry after ${waitMs}ms`
      );
    }

    // Make request with exponential backoff retry
    return this.retryWithBackoff(() => this.doFetch<T>(endpoint));
  }

  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    attempt = 0,
    maxAttempts = 3
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (attempt < maxAttempts - 1 && this.isRetryable(error)) {
        const delayMs = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
        await new Promise(r => setTimeout(r, delayMs));
        return this.retryWithBackoff(fn, attempt + 1, maxAttempts);
      }
      throw error;
    }
  }

  private isRetryable(error: unknown): boolean {
    if (error instanceof APIError) {
      // Retry on server errors and rate limit
      return error.statusCode >= 500 || error.isRateLimited();
    }
    if (error instanceof NetworkError) {
      return true; // Retry network errors
    }
    return false;
  }

  private async doFetch<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: this.buildHeaders()
    });

    // Parse rate limit headers
    const limit = parseInt(response.headers.get("X-Rate-Limit-Limit") || "100");
    const remaining = parseInt(response.headers.get("X-Rate-Limit-Remaining") || "100");
    const reset = parseInt(response.headers.get("X-Rate-Limit-Reset") || "0");

    this.rateLimitInfo = {
      limit,
      remaining,
      resetTime: new Date(reset * 1000)
    };

    if (!response.ok) {
      throw new APIError(response.status, response.statusText, await response.text());
    }

    return response.json() as Promise<T>;
  }
}
```

## Braiins OS gRPC API

### Connection Management

```typescript
import * as grpc from "@grpc/grpc-js";

class BraiinsOSClient {
  private channel: grpc.Channel;
  private stub: braiins.MinerServiceClient;
  private readonly timeout = 30000; // 30 seconds

  constructor(host: string, port: number) {
    this.channel = grpc.createInsecureChannel(`${host}:${port}`);
    this.stub = new braiins.MinerServiceClient(this.channel);
  }

  /**
   * Get detailed miner status
   * Connection per call, not persistent connection
   */
  async getStatus(minerId: string): Promise<MinerStatus> {
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + this.timeout;
      
      this.stub.getStatus(
        { uid: minerId },
        { deadline },
        (err, response) => {
          if (err) {
            this.handleGrpcError(err, minerId, reject);
          } else {
            resolve(response as MinerStatus);
          }
        }
      );
    });
  }

  /**
   * Stream miner metrics (advanced pattern)
   */
  async *streamMetrics(minerId: string): AsyncGenerator<MinerMetrics> {
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + this.timeout;
      
      const stream = this.stub.streamMetrics(
        { uid: minerId },
        { deadline }
      );

      stream.on("data", (data: MinerMetrics) => {
        // Yield each metric as it arrives
      });

      stream.on("error", (err) => {
        this.handleGrpcError(err, minerId, reject);
      });

      stream.on("end", () => {
        resolve();
      });
    });
  }

  private handleGrpcError(
    err: grpc.ServiceError,
    minerId: string,
    reject: (err: Error) => void
  ) {
    switch (err.code) {
      case grpc.status.DEADLINE_EXCEEDED:
        reject(new TimeoutError(`Timeout querying miner ${minerId}`));
        break;
      case grpc.status.UNAUTHENTICATED:
        reject(new AuthError(`Authentication failed for miner ${minerId}`));
        break;
      case grpc.status.UNAVAILABLE:
        reject(new NetworkError(`Miner ${minerId} is unreachable`));
        break;
      case grpc.status.NOT_FOUND:
        reject(new NotFoundError(`Miner ${minerId} not found`));
        break;
      default:
        reject(new GrpcError(
          `gRPC error (code ${err.code}): ${err.message}`
        ));
    }
  }

  async close() {
    this.channel.close();
  }

  async shutdown() {
    return new Promise<void>((resolve, reject) => {
      this.channel.close();
      setTimeout(() => {
        this.channel.forceShutdown();
        resolve();
      }, 5000); // 5 second grace period
    });
  }
}

// Usage in tool
async function getMinerStatus(minerId: string): Promise<MinerStatus> {
  const client = new BraiinsOSClient(
    process.env.BRAIINS_MINER_GRPC_HOST,
    parseInt(process.env.BRAIINS_MINER_GRPC_PORT || "50051")
  );

  try {
    return await client.getStatus(minerId);
  } finally {
    await client.close();
  }
}
```

### gRPC Error Types

```typescript
class GrpcError extends Error {
  constructor(message: string, public code?: number) {
    super(message);
    this.name = "GrpcError";
  }
}

class TimeoutError extends GrpcError {
  constructor(message: string) {
    super(message, grpc.status.DEADLINE_EXCEEDED);
    this.name = "TimeoutError";
  }
}

class AuthError extends GrpcError {
  constructor(message: string) {
    super(message, grpc.status.UNAUTHENTICATED);
    this.name = "AuthError";
  }
}

class NetworkError extends GrpcError {
  constructor(message: string) {
    super(message, grpc.status.UNAVAILABLE);
    this.name = "NetworkError";
  }
}

class NotFoundError extends GrpcError {
  constructor(message: string) {
    super(message, grpc.status.NOT_FOUND);
    this.name = "NotFoundError";
  }
}
```

## Combined API Client Factory

```typescript
class APIClientFactory {
  private restClient: BraiinsPoolAPI;
  private grpcClients: Map<string, BraiinsOSClient> = new Map();

  constructor(
    poolApiKey: string,
    private grpcHost: string,
    private grpcPort: number
  ) {
    this.restClient = new BraiinsPoolAPI(poolApiKey);
  }

  getPoolAPI(): BraiinsPoolAPI {
    return this.restClient;
  }

  /**
   * Get or create gRPC client for miner
   * Note: Not pooled by default to avoid long-lived connections
   */
  createGrpcClient(minerId?: string): BraiinsOSClient {
    return new BraiinsOSClient(this.grpcHost, this.grpcPort);
  }

  /**
   * Pool gRPC clients (for high-volume scenarios)
   */
  getPooledGrpcClient(minerId: string): BraiinsOSClient {
    if (!this.grpcClients.has(minerId)) {
      this.grpcClients.set(
        minerId,
        new BraiinsOSClient(this.grpcHost, this.grpcPort)
      );
    }
    return this.grpcClients.get(minerId)!;
  }

  async shutdownAll() {
    // Close all pooled connections
    for (const client of this.grpcClients.values()) {
      await client.shutdown();
    }
    this.grpcClients.clear();
  }
}

// Initialize once in server.ts
const apiFactory = new APIClientFactory(
  process.env.BRAIINS_POOL_API_KEY!,
  process.env.BRAIINS_MINER_GRPC_HOST || "localhost",
  parseInt(process.env.BRAIINS_MINER_GRPC_PORT || "50051")
);

// Graceful shutdown
process.on("SIGTERM", async () => {
  await apiFactory.shutdownAll();
  process.exit(0);
});
```

## Input Validation Before API Calls

```typescript
class InputValidator {
  static validatePoolId(poolId: string): boolean {
    const regex = /^[a-zA-Z0-9_-]{3,64}$/;
    return regex.test(poolId);
  }

  static validateMinerId(minerId: string): boolean {
    // Miner IDs vary by hardware type, but generally alphanumeric
    const regex = /^[a-zA-Z0-9_-]{3,128}$/;
    return regex.test(minerId);
  }

  static validateBTCAddress(address: string): boolean {
    // Bitcoin address validation (simplified)
    return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/.test(address);
  }

  static validateTemperature(temp: number): boolean {
    // ASIC hardware limits
    return temp >= -50 && temp <= 150;
  }

  static validateHashrate(hashrate: number): boolean {
    return hashrate > 0 && hashrate < 1000000; // Up to 1 million TH/s per miner
  }
}

// Use in tool
@mcp.tool()
async function get_miner_details(miner_id: string): Promise<MinerDetails> {
  // Validate immediately
  if (!InputValidator.validateMinerId(miner_id)) {
    return errorResponse(
      `Invalid miner ID format. Expected alphanumeric, dash, underscore (3-128 chars).`
    );
  }

  // Proceed with API call
  const api = apiFactory.createGrpcClient();
  try {
    return await api.getStatus(miner_id);
  } finally {
    await api.close();
  }
}
```

## Testing API Clients with Mocks

```typescript
// src/api/__mocks__/braiins-pool-api.mock.ts
export const mockPoolAPI = {
  stats: {
    pool_id: "test-pool",
    total_hashrate_ths: 100,
    worker_count: 5,
    estimated_24h_revenue_btc: 0.025
  },

  mockSuccess: (endpoint: string, response: any) => {
    // Mock successful API response
  },

  mockError: (endpoint: string, statusCode: number, message: string) => {
    // Mock error response
  },

  mockTimeout: (endpoint: string) => {
    // Mock timeout
  },

  reset: () => {
    // Reset all mocks
  }
};

// In tests
import { mockPoolAPI } from "@/api/__mocks__";

describe("get_mining_stats", () => {
  beforeEach(() => {
    mockPoolAPI.reset();
  });

  it("should handle API timeout", async () => {
    mockPoolAPI.mockTimeout("/pools/test-pool/stats");

    const result = await getMiningStats("test-pool");

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("timeout");
  });
});
```
