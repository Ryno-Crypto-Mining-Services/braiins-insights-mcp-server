## AGENT_REGISTRY.md

```markdown
# AGENT_REGISTRY.md – Braiins Insights MCP Server Agent Directory

**Project:** [braiins-insights-mcp-server](https://github.com/Ryno-Crypto-Mining-Services/braiins-insights-mcp-server)  
**Version:** 1.0.0  
**Last Updated:** December 13, 2025  
**Maintained By:** Ryno Crypto Mining Services Development Team

---

## Overview

This registry documents all AI coding agents involved in the Braiins Insights MCP Server development. Each agent is specialized for specific phases and task types, enabling efficient parallel development and rapid iteration. The registry serves as the central coordination point for agent discovery, capabilities, and handoff protocols.

### Agent Ecosystem Summary

| Agent | Primary Role | Model Recommendation | Status |
|-------|--------------|---------------------|--------|
| **GitHub Copilot** | Code Generation & Autocompletion | GPT-4 Turbo | Active |
| **Cursor AI** | Refactoring & Batch Operations | Claude Sonnet 4 | Active |
| **Claude Code Interpreter** | Architecture & Code Review | Claude Opus 4 | Active |
| **Architect Agent** | System Design & Planning | Claude Opus 4 | Active |
| **Builder Agent** | Implementation & Development | Claude Sonnet 4 | Active |
| **Validator Agent** | Testing & Quality Assurance | Claude Sonnet 4 | Active |
| **Documentation Agent** | Technical Writing | Claude Haiku 3.5 | Active |

---

## Registered Agents

### 1. GitHub Copilot Agent

**Agent ID:** `copilot-code-gen`  
**Version:** GPT-4 Turbo (2024-11-20)  
**Status:** ✅ Active  
**Role:** Rapid code generation and autocompletion  

#### Capabilities

- **Fast Code Generation:** Tab-complete boilerplate and repetitive patterns
- **Context-Aware Suggestions:** Learns from existing codebase patterns
- **Configuration File Creation:** Generate package.json, tsconfig.json, ESLint configs
- **Endpoint Method Generation:** Create API client methods following established patterns
- **Test Fixture Creation:** Generate mock data for unit tests

#### Optimal Use Cases

```

// 1. Generating configuration files
Prompt: "Generate package.json for TypeScript MCP server with @modelcontextprotocol/sdk@^1.0.4"

// 2. Completing endpoint methods from pattern
// Given one example method, Copilot completes the remaining 13 endpoints
async getHashrateStats(): Promise<InsightsHashrateStats> {
return this.get<InsightsHashrateStats>('/v1.0/hashrate-stats');
}
// → Tab-complete: getDifficultyStats, getBlocks, etc.

// 3. Generating repetitive tool classes
// After creating HashrateStatsTool, Copilot suggests DifficultyStatsTool with same structure

```

#### Dependencies

- **Requires:** Visual Studio Code or GitHub Codespaces
- **Coordinates with:** Cursor AI (post-generation refactoring), Claude (pattern design)

#### Allowed Tools

```

- Editor: Read, Write (active file)
- Context: Read (open files, git history)
- Suggestions: Inline code completion
- Chat: GitHub Copilot Chat (queries about code)

```

#### Restrictions

- ❌ **NO** architectural decisions without Architect Agent approval
- ❌ **NO** complex error handling (prone to incomplete patterns)
- ⚠️ **REQUIRES** human/Claude review for security-sensitive code
- ⚠️ **MUST** run Prettier after generation (inconsistent formatting)

#### Handoff Points

- **→ Cursor AI:** After generating 10+ files for batch consistency check
- **→ Claude:** After completing API client methods for architectural review
- **← Architect Agent:** Receives design patterns to implement

---

### 2. Cursor AI Agent

**Agent ID:** `cursor-refactor`  
**Version:** Claude Sonnet 4 (via Cursor IDE)  
**Status:** ✅ Active  
**Role:** Multi-file refactoring, batch operations, and test generation  

#### Capabilities

- **Multi-File Editing:** Apply transformations across entire directories
- **Pattern Detection:** Identify and refactor inconsistent code patterns
- **Batch Test Generation:** Create comprehensive test suites for multiple components
- **Project Structure Creation:** Scaffold entire directory trees with placeholders
- **Consistency Enforcement:** Apply uniform error handling, logging, and style

#### Optimal Use Cases

```

// 1. Create directory structure
Command: Batch create folders: types/, api/, tools/{simple,parameterized,historical,composite}/

// 2. Batch edit all tool files
Select: src/tools/simple/*.ts
Prompt: "Ensure all tools have consistent error handling and log tool name on execute"

// 3. Generate tests for all API methods
Select: src/api/insights-client.ts
Prompt: "Generate comprehensive unit tests with mocked fetch for all 14 endpoint methods"

// 4. Refactor for consistency
Select: src/tools/*.ts (17 files)
Prompt: "Standardize markdown formatting to use \#\# for section headers and \#\#\# for subsections"

```

#### Dependencies

- **Requires:** Cursor IDE installation
- **Coordinates with:** GitHub Copilot (initial generation), Claude (review refinements)

#### Allowed Tools

```

- Multi-file Edit: Read, Write (selected files)
- Batch Operations: Create, Delete, Rename
- Search/Replace: Project-wide find and replace
- AI Chat: Context-aware queries with codebase knowledge

```

#### Restrictions

- ❌ **NO** production deployments
- ❌ **NO** git operations without human confirmation
- ⚠️ **REQUIRES** test execution after batch refactoring
- ⚠️ **MUST** commit changes incrementally (not 50 files at once)

#### Handoff Points

- **→ Validator Agent:** After generating test suites for execution
- **← GitHub Copilot:** Receives generated code for batch refinement
- **← Claude:** Receives review feedback for batch application

---

### 3. Claude Code Interpreter Agent

**Agent ID:** `claude-architect-reviewer`  
**Version:** Claude Opus 4  
**Status:** ✅ Active  
**Role:** Deep architectural reasoning, code review, and complex problem solving  

#### Capabilities

- **Architectural Design:** Create class hierarchies, design patterns, type systems
- **Complex Logic Design:** Multi-step algorithms (cache invalidation, rate limiting)
- **Code Review:** Line-by-line analysis for security, performance, correctness
- **Schema Design:** Zod validation schemas with refinements
- **Trade-off Analysis:** Evaluate multiple implementation approaches with pros/cons
- **Documentation Generation:** Comprehensive technical documents from specifications

#### Optimal Use Cases

```

// 1. Design class structure
Prompt: "Design the InsightsApiClient class structure with error handling,
caching, and rate limiting. Show one example endpoint method."

// 2. Create Zod validation schema
Prompt: "Create Zod schema for blocks tool with page (1-1000), page_size (1-100),
start_date (ISO 8601), end_date (ISO 8601). Ensure start_date < end_date."

// 3. Comprehensive code review
Prompt: "Review InsightsApiClient for:
1. Type safety and correctness
2. Error handling completeness
3. Performance bottlenecks
4. Security vulnerabilities
5. Missing edge cases
Provide specific line-by-line feedback with code examples."

// 4. Complex orchestration
Prompt: "Design composite tool architecture with Promise.allSettled pattern
for graceful degradation on partial failures."

```

#### Dependencies

- **Requires:** Claude Desktop or Claude API access
- **Coordinates with:** All agents (provides architectural guidance and review)

#### Allowed Tools

```

- Read: All project files
- Analysis: Deep code inspection
- Design: Architecture and pattern creation
- Review: Security and quality assessment
- Documentation: Technical writing

```

#### Restrictions

- ❌ **NO** direct code implementation (delegates to Builder/Copilot)
- ❌ **NO** batch operations (delegates to Cursor)
- ⚠️ **FOCUS** on design, review, and complex reasoning
- ⚠️ **REQUIRES** 3-4 hours for comprehensive codebase review

#### Handoff Points

- **→ GitHub Copilot:** After designing patterns for implementation
- **→ Builder Agent:** After creating detailed implementation specifications
- **→ Cursor AI:** After identifying systematic issues for batch fixing
- **← All Agents:** Receives code for review and improvement suggestions

---

### 4. Architect Agent

**Agent ID:** `architect-v1`  
**Version:** Claude Opus 4  
**Status:** ✅ Active  
**Role:** System design, technology selection, and planning document creation  

#### Capabilities

- **Requirements Analysis:** Translate user needs into technical specifications
- **Architecture Design:** Create component hierarchies and interaction patterns
- **Technology Stack Evaluation:** Select frameworks, libraries, and tools
- **Planning Document Generation:** Create ARCHITECTURE.md, DEVELOPMENT_PLAN.md
- **Codebase Analysis:** Assess existing projects for refactoring opportunities

#### Responsibilities (Per AGENTS.md)

**For New Projects:**
1. Requirements gathering through structured questions
2. System architecture and component breakdown
3. Technology stack justification
4. Development roadmap with milestones

**For Existing Projects:**
1. Codebase analysis (structure, dependencies, patterns)
2. Architecture assessment (scalability, maintainability, security)
3. Improvement recommendations with priorities
4. Refactoring strategy and timeline

#### Context Requirements

```

Essential Files:

- AGENTS.md (universal standards)
- README.md (project overview)
- package.json (dependencies)
- API.md (Braiins Insights API spec)
- MULTIAGENT_PLAN.md (coordination strategy)

```

#### Allowed Tools

```

- Read: All project files
- Search: Codebase patterns
- Edit: Planning documents only (ARCHITECTURE.md, DEVELOPMENT_PLAN.md)
- Bash:git:log: Review project history
- Bash:git:diff: Analyze code changes
- Bash:find: Discover project structure

```

#### Restrictions

- ❌ **NO** direct code modification (Builder Agent responsibility)
- ❌ **NO** deployment or infrastructure changes
- ❌ **NO** external network calls without approval
- ⚠️ **MUST** document all architectural decisions with rationale

#### Handoff Protocol

```


## Handoff: Architect → Builder

**Completed:** System architecture and component design
**Output:**

- ARCHITECTURE.md (complete technical specification)
- DEVELOPMENT_PLAN.md (12-week implementation roadmap)
- TODO.md (prioritized task list)

**Context for Builder Agent:**

- Use InsightsApiClient pattern for all API communication
- Implement 17 tools across 4 categories (simple, parameterized, historical, composite)
- Follow caching strategy: 30s (blocks) to 24h (halvings)
- Zod validation required for all parameterized tools

**Next Steps:**

1. Implement API client core (Week 2)
2. Create tool base classes (Week 3)
3. Generate simple tools with Copilot (Week 3-4)
```

---

### 5. Builder Agent

**Agent ID:** `builder-v1`  
**Version:** Claude Sonnet 4  
**Status:** ✅ Active  
**Role:** Code implementation, feature development, and incremental delivery  

#### Capabilities

- **Feature Implementation:** Translate specifications into production code
- **Bug Fixing:** Root cause analysis and minimal fixes with tests
- **Code Refactoring:** Improve code quality while maintaining functionality
- **Integration Work:** Connect components into cohesive systems
- **Test-Driven Development:** Write tests before implementation

#### Responsibilities (Per AGENTS.md)

1. **Implementation Planning:** Break architecture into granular tasks
2. **Code Development:** Write production-quality TypeScript
3. **Incremental Delivery:** Implement features in testable phases
4. **Technical Problem-Solving:** Resolve implementation challenges
5. **Development Documentation:** Maintain inline comments and JSDoc

#### Task Workflow Example

```


# Implementation Plan: API Client (Week 2)

## Phase 1: Core HTTP Client (4 hours)

- ✅ Task 1.1: Create InsightsApiClient class skeleton
- ✅ Task 1.2: Implement get<T>() method with error handling
- ✅ Task 1.3: Implement post<T>() method
- ✅ Task 1.4: Write unit tests with mocked fetch


## Phase 2: v1.0 Endpoints (6 hours)

- ⏳ Task 2.1: Implement getHashrateStats()
- ⏳ Task 2.2: Implement getDifficultyStats()
- 🔲 Task 2.3-2.11: Implement remaining 9 v1.0 methods
- 🔲 Task 2.12: Write unit tests for all v1.0 methods


## Phase 3: v2.0 Endpoints (3 hours)

- 🔲 Task 3.1: Implement getCostToMine() with optional params
- 🔲 Task 3.2: Implement getProfitabilityCalculator() with required params
- 🔲 Task 3.3: Implement getHalvings()
- 🔲 Task 3.4: Write unit tests

Status: Phase 1 Complete, Phase 2 In Progress (40% done)
Next Handoff: → Validator Agent (after Phase 3 complete)

```

#### Allowed Tools

```

- Read: All project files
- Search: Codebase navigation
- Edit: Source code (.ts files)
- Bash:git: Full git operations (branch, commit, push)
- Bash:npm: Package management (install, test, build)
- Test: Run Jest test suites
- Lint: Run ESLint
- Format: Run Prettier

```

#### Restrictions

- ❌ **NO** production deployments (DevOps Agent responsibility)
- ❌ **NO** architecture changes without Architect approval
- ❌ **NO** merging to main/production branches without review
- ⚠️ **MUST** write tests before marking implementation complete
- ⚠️ **MUST** run linter and formatter before commits

#### Handoff Points

- **→ Validator Agent:** After completing feature for testing
- **→ Documentation Agent:** After implementation for docs update
- **← Architect Agent:** Receives specifications and design patterns
- **← Validator Agent:** Receives bug reports and test failures

---

### 6. Validator Agent

**Agent ID:** `validator-v1`  
**Version:** Claude Sonnet 4  
**Status:** ✅ Active  
**Role:** Testing, quality assurance, security scanning, and code review  

#### Capabilities

- **Automated Testing:** Execute unit, integration, and E2E test suites
- **Code Quality Analysis:** ESLint, Prettier, TypeScript compiler checks
- **Security Scanning:** Identify vulnerabilities and insecure patterns
- **Performance Benchmarking:** Measure response times and memory usage
- **Coverage Analysis:** Ensure >80% test coverage threshold
- **Code Review:** Provide actionable feedback on pull requests

#### Testing Strategy (Per ARCHITECTURE.md)

```

Test Pyramid:
/\
/  \  E2E Tests (5%)
/────\  - Full MCP tool execution
/      \ - Live API integration (1 endpoint)
/────────\
/ Integra- \ Integration Tests (25%)
/ tion Tests \  - Tool + API client with fixtures
/──────────────\ - Cache behavior verification
/                \
/  Unit Tests (70%)\
────────────────────  - Individual tool execution
- Cache logic
- Response transformation
- Zod validation

```

#### Validation Checklist

```

Pre-Deployment Validation:

✅ Unit Tests

- [ ] All tests passing (npm test)
- [ ] Coverage >80% (npm run coverage)
- [ ] No skipped tests without justification

✅ Integration Tests

- [ ] API client tests with fixtures passing
- [ ] Cache hit/miss scenarios validated
- [ ] Error handling tests complete

✅ E2E Tests

- [ ] At least 1 tool tested against live Insights API
- [ ] MCP protocol communication verified
- [ ] Composite tools tested with parallel requests

✅ Code Quality

- [ ] ESLint: 0 errors, 0 warnings
- [ ] Prettier: All files formatted
- [ ] TypeScript: Compiles with no errors
- [ ] No console.log() statements (use logger)

✅ Security

- [ ] No hardcoded secrets or API keys
- [ ] Input validation with Zod for all parameterized tools
- [ ] Rate limiting tested (client-side 30 req/min)
- [ ] Error messages don't leak sensitive info

✅ Performance

- [ ] Simple tools respond <500ms (cached)
- [ ] Composite tools respond <2s (parallel requests)
- [ ] Cache hit rate >70% for medium-frequency endpoints

```

#### Allowed Tools

```

- Read: All files
- Test: Jest execution (all test types)
- Lint: ESLint, Prettier
- Coverage: Istanbul/NYC coverage reports
- Security: npm audit, Snyk (if configured)
- Performance: Benchmark execution times
- Review: GitHub PR comments API

```

#### Restrictions

- ❌ **NO** code modification (provides feedback only)
- ❌ **NO** production access (test against staging/dev)
- ⚠️ **REQUIRES** approval for deployment validation
- ⚠️ **MUST** fail loudly on security issues

#### Handoff Points

- **→ Builder Agent:** Returns code with issues found and fix suggestions
- **→ DevOps Agent:** Approves code for deployment after all checks pass
- **← Builder Agent:** Receives completed features for testing

---

### 7. Documentation Agent

**Agent ID:** `scribe-v1`  
**Version:** Claude Haiku 3.5  
**Status:** ✅ Active  
**Role:** Technical documentation creation and maintenance  

#### Capabilities

- **API Documentation:** Generate reference docs from JSDoc comments
- **User Guides:** Create step-by-step usage instructions
- **README Maintenance:** Keep project overview current with features
- **Changelog Updates:** Document version changes
- **Architecture Diagrams:** Create ASCII diagrams for ARCHITECTURE.md

#### Documentation Deliverables (Week 12)

```

Week 12 Documentation Sprint:

Day 1-2: Core Documents (Claude Opus 4)

- [ ] README.md (project overview, quick start)
- [ ] INSTALLATION.md (setup guide with troubleshooting)
- [ ] USAGE_GUIDE.md (all 17 tools with examples)
- [ ] CONTRIBUTING.md (development workflow, code style)
- [ ] DEPLOYMENT.md (production deployment)

Day 3: API Reference (GitHub Copilot)

- [ ] Add JSDoc comments to all public APIs
- [ ] Document all 14 API client methods
- [ ] Document all 17 tool classes

Day 4: Generated Docs (Cursor AI)

- [ ] Generate API reference with TypeDoc
- [ ] Extract examples from E2E tests
- [ ] Create command reference from tool schemas

Day 5: Review \& Polish (Claude Opus 4)

- [ ] Comprehensive review of all documentation
- [ ] Fix inconsistencies and gaps
- [ ] Ensure examples are accurate and tested

```

#### Allowed Tools

```

- Read: All files (source code, tests, planning docs)
- Search: Codebase navigation for examples
- Edit: Documentation files (.md, JSDoc comments)
- Format: Markdown formatting

```

#### Restrictions

- ❌ **NO** code modification (source code)
- ❌ **NO** deployment operations
- ⚠️ **MUST** verify all code examples compile and run
- ⚠️ **REQUIRES** Builder Agent review for technical accuracy

#### Handoff Points

- **→ Builder Agent:** Requests implementation details and API usage examples
- **→ Validator Agent:** Requests test examples for documentation
- **← All Agents:** Receives information for documentation

---

## Agent Communication Protocols

### Standard Message Format

All agent handoffs must use this structured format:

```

{
"handoff_id": "unique-identifier",
"from_agent": "architect-v1",
"to_agent": "builder-v1",
"timestamp": "2025-12-13T19:00:00Z",
"task": {
"id": "api-client-implementation",
"objective": "Implement InsightsApiClient with all 14 endpoint methods",
"priority": "P0",
"estimated_effort": "8 hours"
},
"context": {
"completed_work": [
"ARCHITECTURE.md created with full API client specification",
"Type definitions in src/types/insights-api.ts"
],
"decisions": [
"Use fetch API (not axios) for HTTP client",
"Cache TTL varies by endpoint (30s to 24h)",
"Rate limit: 30 req/min client-side"
],
"constraints": [
"No authentication required (public API)",
"Must handle network errors gracefully",
"All responses must be typed with Zod validation"
]
},
"deliverables": [
"src/api/insights-client.ts with 14 methods",
"tests/unit/api/insights-client.test.ts with 80%+ coverage",
"All methods documented with JSDoc"
],
"success_criteria": [
"All unit tests passing",
"TypeScript compiles with no errors",
"ESLint passes with 0 warnings",
"At least 1 integration test with live API succeeds"
],
"next_steps": "After completion, hand off to Validator Agent for testing"
}

```

### Coordination Hub: MULTIAGENT_PLAN.md

The MULTIAGENT_PLAN.md file serves as the living coordination document where:

- **Overall project goals** are documented with 12-week timeline
- **Task breakdown** shows dependencies between agent work
- **Agent assignments** map tasks to responsible agents
- **Status updates** track progress (not started, in progress, done, blocked)
- **Handoff points** define when control transfers between agents

**Update Protocol:**
1. Agent marks task as "in progress" when starting
2. Agent updates status daily with progress notes
3. Agent marks task as "done" and notifies next agent
4. Orchestrator (human) reviews weekly and adjusts plan

---

## Agent Selection Guidelines

### Task-to-Agent Mapping

| Task Type | Primary Agent | Secondary Agent | Duration Estimate |
|-----------|---------------|-----------------|-------------------|
| **System Architecture** | Architect Agent | Claude Interpreter | 2-3 days |
| **Configuration Files** | GitHub Copilot | Cursor AI (review) | 2-3 hours |
| **Type Definitions** | Claude Interpreter | - | 3-4 hours |
| **API Client Core** | Builder Agent | Copilot (boilerplate) | 4 hours |
| **API Endpoint Methods** | GitHub Copilot | Cursor (batch edit) | 6-8 hours |
| **Simple Tools (7)** | GitHub Copilot | Cursor (tests) | 8-10 hours |
| **Parameterized Tools (5)** | Builder Agent | Claude (Zod schemas) | 10-12 hours |
| **Historical Tools (4)** | Cursor AI | - | 6-8 hours |
| **Composite Tools (3)** | Claude Interpreter | Builder (implement) | 8-10 hours |
| **Unit Tests** | Cursor AI | Copilot (fixtures) | 12-15 hours |
| **Integration Tests** | Builder Agent | - | 6-8 hours |
| **E2E Tests** | Validator Agent | - | 4-6 hours |
| **Code Review** | Claude Interpreter | Validator Agent | 3-4 hours |
| **Documentation** | Documentation Agent | Copilot (JSDoc) | 2-3 days |
| **Refactoring** | Cursor AI | Claude (guidance) | Variable |

### Orchestration Patterns

#### Sequential Pipeline (Waterfall)

```

Architect → Builder → Validator → Documentation → Done

```

**Use When:** Clear dependencies, each phase builds on previous  
**Example:** Core API client implementation

#### Parallel Development (Concurrent)

```

            ┌─→ Builder-1 (Simple Tools) ──┐
    Architect ──┼─→ Builder-2 (Parameterized) ─┼─→ Validator → Done
└─→ Builder-3 (Historical) ────┘

```

**Use When:** Independent features with no cross-dependencies  
**Example:** Implementing 17 tools simultaneously (3 agents in parallel)

#### Research-Driven (Investigation)

```

Question → Researcher → Architect → Builder → Validator → Done

```

**Use When:** Uncertainty about approach, need technology evaluation  
**Example:** Choosing between Redis vs in-memory caching

#### Iterative Refinement (Feedback Loop)

```

Builder → Validator → [Issues Found] → Builder → Validator → [Pass] → Done
↑                         ↓
└─────────────────────────┘

```

**Use When:** Complex features requiring multiple iterations  
**Example:** Composite tools with parallel request handling

---

## Quality Gates

Before any phase transition, all agents must achieve:

### Phase 1 Gate (Infrastructure Complete)

```

✅ Project Structure

- [ ] All directories created per ARCHITECTURE.md
- [ ] package.json with correct dependencies
- [ ] TypeScript configured (tsconfig.json)
- [ ] ESLint and Prettier configured
- [ ] All type definitions in src/types/

✅ Build System

- [ ] npm install completes without errors
- [ ] npm run build completes successfully
- [ ] npm run lint passes with 0 errors
- [ ] npm run format doesn't change any files

✅ Documentation

- [ ] README.md exists with project overview
- [ ] ARCHITECTURE.md complete and reviewed
- [ ] DEVELOPMENT_PLAN.md approved by Architect

✅ Git Setup

- [ ] .gitignore configured correctly
- [ ] Initial commit: "feat: project scaffolding"

```

### Phase 2 Gate (API Client Complete)

```

✅ Implementation

- [ ] All 14 API methods implemented
- [ ] Caching layer functional (TTL per endpoint)
- [ ] Rate limiter enforces 30 req/min
- [ ] Error classes defined (InsightsApiError, etc.)

✅ Testing

- [ ] Unit tests for all methods (mocked fetch)
- [ ] Coverage >80% for InsightsApiClient
- [ ] At least 1 integration test with live API succeeds
- [ ] Cache hit/miss tests passing

✅ Quality

- [ ] TypeScript compiles with no errors
- [ ] ESLint: 0 errors, 0 warnings
- [ ] All methods have JSDoc comments
- [ ] No console.log() statements

✅ Review

- [ ] Claude Interpreter code review complete
- [ ] Validator Agent sign-off
- [ ] No security issues identified

```

### Phase 3 Gate (All Tools Complete)

```

✅ Tool Implementation (17 total)

- [ ] 7 Simple stats tools working
- [ ] 5 Parameterized tools with Zod validation
- [ ] 4 Historical data tools functional
- [ ] 3 Composite tools with parallel requests

✅ Testing (Test Pyramid)

- [ ] 70% Unit tests: All tools tested in isolation
- [ ] 25% Integration tests: Tool + API client
- [ ] 5% E2E tests: Full MCP protocol execution
- [ ] Coverage >80% across all tool files

✅ Quality

- [ ] All tools follow consistent markdown formatting
- [ ] Error handling graceful (composite tools degrade gracefully)
- [ ] Response times: Simple <500ms, Composite <2s
- [ ] Memory usage within acceptable limits

✅ Documentation

- [ ] All 17 tools documented in USAGE_GUIDE.md
- [ ] Examples tested and accurate
- [ ] Edge cases documented

```

### Production Readiness Gate

```

✅ Deployment

- [ ] MCP server starts successfully
- [ ] All 17 tools registered and discoverable
- [ ] stdio transport communication verified
- [ ] Claude Desktop integration tested

✅ Performance

- [ ] Cache hit rate >70% for medium-frequency endpoints
- [ ] Simple queries respond in <2 seconds
- [ ] Composite queries respond in <5 seconds
- [ ] No memory leaks after 1000 requests

✅ Documentation

- [ ] README.md complete with quick start
- [ ] INSTALLATION.md with troubleshooting
- [ ] USAGE_GUIDE.md with all tool examples
- [ ] CONTRIBUTING.md with development workflow
- [ ] DEPLOYMENT.md with production instructions

✅ Compliance

- [ ] All code reviewed by Claude Interpreter
- [ ] Security scan clean (no npm audit warnings)
- [ ] License file present (Apache 2.0)
- [ ] No hardcoded secrets or credentials

```

---

## Agent Lifecycle Management

### Registration Process

1. **Define Agent Role:** Identify specialized capability needed
2. **Create Configuration:** Document capabilities, tools, restrictions
3. **Update AGENT_REGISTRY.md:** Add complete agent entry
4. **Test Agent:** Validate capabilities with sample tasks
5. **Activate:** Set status to "Active" and begin assignments
6. **Document Handoffs:** Define clear integration points with other agents

### Deprecation Process

1. **Mark as Deprecated:** Update status in registry with reason
2. **Migration Plan:** Document transition to replacement agent/workflow
3. **Sunset Timeline:** Set deactivation date (minimum 2 weeks notice)
4. **Archive:** Move to "Deprecated Agents" section with final report
5. **Update Documentation:** Remove references from active workflows

### Performance Monitoring

Track each agent's contributions weekly:

```


## Agent Performance Report (Week 8)

| Agent | Tasks Completed | Lines of Code | Tests Written | Bugs Found | Avg Quality Score |
| :-- | :-- | :-- | :-- | :-- | :-- |
| GitHub Copilot | 45 | 4,827 | 156 | 3 | 7.8/10 |
| Cursor AI | 28 | 1,203 | 189 | 8 | 8.5/10 |
| Claude Interpreter | 12 | 621 | 42 | 31 | 9.2/10 |
| Architect Agent | 3 | 0 | 0 | - | 9.5/10 |
| Builder Agent | 38 | 5,104 | 201 | 5 | 8.7/10 |
| Validator Agent | 52 | 0 | 0 | 47 | 9.0/10 |

**Insights:**

- Copilot excels at rapid boilerplate generation (4.8K LOC in 45 tasks)
- Cursor most effective for test generation (189 tests, 28 tasks)
- Claude finds most bugs during review (31 issues identified)
- Validator Agent has highest bug detection rate (47 issues)
- Builder Agent maintains high code quality (8.7/10) with high output

```

---

## Security & Governance

### Access Control Matrix

| Agent | Read Access | Write Access | Deployment | External API Calls | Requires Approval |
|-------|-------------|--------------|------------|-------------------|-------------------|
| Architect | All files | Planning docs only | ❌ | ❌ | Architecture changes |
| Builder | All files | Source code | ❌ | ❌ | Breaking changes |
| Validator | All files | Test files, reports | ❌ | Insights API (read-only) | Production tests |
| Documentation | All files | Markdown docs | ❌ | ❌ | Major doc restructure |
| GitHub Copilot | Open files | Active file | ❌ | ❌ | Security-sensitive code |
| Cursor AI | Selected files | Selected files | ❌ | ❌ | Batch operations >20 files |
| Claude Interpreter | All files | None (review only) | ❌ | ❌ | Never (read-only) |

### Audit Trail

All agent actions are logged in SESSION_SUMMARY.md with:

```


## Agent Action Log

**Timestamp:** 2025-12-13T19:15:00Z
**Agent:** builder-v1
**Action:** code_modification
**Files Modified:** src/api/insights-client.ts, tests/unit/api/insights-client.test.ts
**Commit:** feat: implement v1.0 API endpoint methods (abc1234)
**Reviewer:** claude-architect-reviewer
**Status:** Approved
**Notes:** All 11 v1.0 endpoints implemented following established pattern

```

### Compliance Requirements

- **AGENTS.md Compliance:** All agents must follow universal rules
- **Code Quality:** ESLint, Prettier, TypeScript strict mode
- **Security:** No hardcoded secrets, Zod validation for all inputs
- **Testing:** Minimum 80% coverage, all tests must pass
- **Documentation:** JSDoc for all public APIs, examples tested

---

## Contingency Plans

### If GitHub Copilot Unavailable

**Backup Strategy:**
1. Fall back to manual coding + Cursor AI for autocompletion
2. Use Claude Interpreter for complex logic generation
3. Builder Agent increases capacity for boilerplate implementation
4. **Expected Impact:** 30-40% slower code generation

**Mitigation:**
- Maintain templates for common patterns (tool classes, endpoint methods)
- Pre-generate frequently-used snippets in VSCode snippets file

### If Cursor AI Unavailable

**Backup Strategy:**
1. Use GitHub Copilot for individual file editing
2. Batch operations done manually with find/replace scripts
3. Validator Agent performs manual consistency checks
4. **Expected Impact:** 50-60% slower batch operations and refactoring

**Mitigation:**
- Create bash scripts for common batch operations
- Increase Builder Agent allocation for manual refactoring

### If Claude Interpreter Unavailable

**Backup Strategy:**
1. Architect Agent assumes design responsibilities
2. Validator Agent increases review rigor
3. Human architect performs critical design decisions
4. **Expected Impact:** 40-50% slower architectural decisions and reviews

**Mitigation:**
- Pre-design common patterns during availability
- Document architectural guidelines in ARCHITECTURE.md for self-service

### If Builder Agent Overloaded

**Backup Strategy:**
1. Spawn multiple Builder instances with isolated contexts
2. Assign specific components to each instance (tools, API, tests)
3. Use Cursor AI for simpler implementation tasks
4. **Expected Impact:** Minimal (horizontal scaling)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | 2025-12-13 | Initial registry creation with 7 agents | Development Team |

---

## Appendices

### A. Agent Configuration Files

- `AGENTS.md` - Universal agent rules and standards
- `CLAUDE.md` - Claude-specific configuration
- `COPILOT.md` - GitHub Copilot configuration
- `MULTIAGENT_PLAN.md` - Coordination strategy

### B. Communication Protocol Examples

See MULTIAGENT_PLAN.md Section "Agent Communication Protocol"

### C. Performance Benchmarks

**Target Agent Velocity:**
- Week 1-2: Complete Phase 1 (Infrastructure) - All agents
- Week 3-7: Complete Phase 2 (17 Tools) - Copilot, Cursor, Builder, Claude
- Week 8-9: Complete Phase 3 (MCP Server) - Builder, Validator
- Week 10-11: Complete Phase 4 (Testing & QA) - Validator, Cursor
- Week 12: Complete Phase 5 (Documentation) - Documentation, Copilot

**Efficiency Metrics:**
- Development time: 40-60% reduction vs single developer
- Code quality: Maintained via Claude reviews and Validator checks
- Test coverage: >80% via Cursor batch generation
- Bug detection: 3x higher with multi-agent review

---

**Next Review:** Weekly during active development  
**Maintained By:** Ryno Crypto Mining Services Development Team  
**Contact:** See CONTRIBUTING.md for maintainer information

---

*This AGENT_REGISTRY.md is a living document. All agents must update their entries when capabilities, restrictions, or coordination protocols change.*
