# Braiins Insights MCP Server: Skills, Commands, and Agents Summary

**Created**: December 13, 2025
**Version**: 1.0.0
**Purpose**: Comprehensive catalog of project-specific Claude Code skills, commands, and agents

---

## Overview

This document catalogs all project-specific skills, commands, and agents created for the Braiins Insights MCP Server project. These assets follow the **skills-first paradigm** and are designed to accelerate development using Claude Code.

---

## 📁 Directory Structure

```
braiins-insights-mcp-server/
├── .claude/
│   ├── skills/                      # Reusable workflow skills
│   │   ├── braiins-api-discovery.md
│   │   ├── braiins-type-system-design.md
│   │   └── braiins-tool-implementation.md
│   ├── commands/                    # Slash commands
│   │   ├── api-discover.md
│   │   └── implement-tool.md
│   └── agents/                      # Specialized agent configurations
│       ├── api-explorer.md
│       └── mcp-tool-builder.md
├── SKILLS_COMMANDS_AGENTS_SUMMARY.md  # This file
└── [rest of project files]
```

---

## 🎯 Skills (3 Total)

Skills are the primary building blocks - reusable workflow automation units that agents dynamically load.

### 1. braiins-api-discovery

**File**: `.claude/skills/braiins-api-discovery.md`

**Purpose**: Systematically explore Braiins Insights Dashboard API endpoints to discover undocumented parameters, validate response structures, and generate comprehensive type definitions.

**When to Use**:
- Discovering undocumented query parameters for an endpoint
- Validating API response structures against type definitions
- Testing new or unknown API endpoints
- Generating fixtures for integration tests
- Documenting API behavior and edge cases

**Key Workflows**:
1. Identify target endpoint
2. Test baseline endpoint (no parameters)
3. Systematic parameter discovery:
   - Pagination (page, page_size, limit, offset)
   - Date filtering (start_date, end_date)
   - Sorting (sort, order)
   - Filtering (pool, country, min/max)
4. Document findings in discovery report
5. Update API documentation

**Outputs**:
- Discovery report (`docs/api-discovery/${endpoint-name}.md`)
- Type definition recommendations
- Test fixtures from actual API responses
- Updated API.md

**Example Usage**:
```markdown
Load @.claude/skills/braiins-api-discovery.md

Follow systematic workflow to discover parameters for /v1.0/blocks endpoint.
```

---

### 2. braiins-type-system-design

**File**: `.claude/skills/braiins-type-system-design.md`

**Purpose**: Design comprehensive TypeScript type systems for Braiins Insights API responses. Analyzes API response structures, creates hierarchical type definitions with JSDoc comments, and ensures type safety across the MCP server.

**When to Use**:
- Creating initial type definitions for new API endpoints
- Updating types after API discovery reveals new fields
- Designing type hierarchies for related endpoints
- Ensuring type safety across the MCP server codebase
- Documenting API response structures with JSDoc

**Key Workflows**:
1. Analyze raw API response structure
2. Identify field types and map to TypeScript
3. Design interface with JSDoc documentation
4. Create query parameter types
5. Create type guards for runtime validation
6. Handle nested structures
7. Test type definitions against fixtures

**Outputs**:
- TypeScript interfaces in `src/types/insights-api.ts`
- Type guards (`isHashrateStats`, etc.)
- JSDoc documentation for all fields
- Type tests

**Example Usage**:
```markdown
Load @.claude/skills/braiins-type-system-design.md

Design TypeScript interfaces for hashrate stats endpoint based on actual API response.
```

---

### 3. braiins-tool-implementation

**File**: `.claude/skills/braiins-tool-implementation.md`

**Purpose**: Implement MCP tools for Braiins Insights API endpoints following project patterns and best practices. Includes tool class creation, input validation with Zod, response formatting to markdown, error handling, and test creation.

**When to Use**:
- Implementing new MCP tools for Braiins Insights endpoints
- Creating simple stats tools (no parameters)
- Creating parameterized tools (with input validation)
- Creating historical data tools (time-series)
- Creating composite tools (multi-endpoint aggregators)
- Adding tests and documentation for tools

**Key Workflows**:

**Pattern 1: Simple Stats Tool** (No Parameters)
1. Create tool class with name, description, inputSchema
2. Implement execute() method
3. Add formatAsMarkdown() method
4. Add handleError() method
5. Register in MCP server
6. Create unit and integration tests

**Pattern 2: Parameterized Tool** (With Validation)
1. Define Zod input schema
2. Generate JSON schema from Zod
3. Implement execute() with validation
4. Add formatAsTable() method
5. Handle validation errors
6. Register and test

**Pattern 3: Composite Tool** (Multi-Endpoint)
1. Define input schema
2. Implement parallel requests with Promise.allSettled
3. Add buildReport() with graceful degradation
4. Handle partial failures
5. Register and test

**Outputs**:
- Tool class file (`src/tools/${category}/${tool-name}.ts`)
- Unit tests (`tests/unit/tools/${tool-name}.test.ts`)
- Integration tests (`tests/integration/tools/${tool-name}.integration.test.ts`)
- Updated server registration (`src/index.ts`)
- Updated documentation (`README.md`, `USAGE_GUIDE.md`)

**Example Usage**:
```markdown
Load @.claude/skills/braiins-tool-implementation.md

Implement braiins_hashrate_stats tool following Simple Stats Tool pattern.
```

---

## 🚀 Commands (2 Total)

Commands are slash commands that provide quick session shortcuts for common workflows.

### 1. /api-discover

**File**: `.claude/commands/api-discover.md`

**Usage**: `/api-discover <endpoint-path>`

**Purpose**: Systematically discover undocumented parameters for Braiins Insights API endpoints, test variations, and generate comprehensive documentation with type definitions and test fixtures.

**Examples**:
```bash
/api-discover /v1.0/blocks
/api-discover /v1.0/hashrate-stats
/api-discover /v2.0/profitability-calculator
```

**Workflow**:
1. Load braiins-api-discovery skill
2. Test baseline endpoint
3. Test parameter variations systematically
4. Create discovery report
5. Update type definitions
6. Generate test fixtures
7. Update API.md

**Outputs**:
- Discovery report (`docs/api-discovery/${endpoint-name}.md`)
- Type definitions (`src/types/insights-api.ts`)
- Test fixtures (`tests/integration/fixtures/`)
- Updated API.md

**When to Use**:
- Before implementing a tool for an endpoint
- When API documentation is incomplete
- When testing new API versions
- When validating existing type definitions

---

### 2. /implement-tool

**File**: `.claude/commands/implement-tool.md`

**Usage**: `/implement-tool <tool-name> [--category simple|parameterized|historical|composite]`

**Purpose**: Implement a complete MCP tool for a Braiins Insights API endpoint including tool class, input validation, response formatting, error handling, unit tests, and integration tests.

**Examples**:
```bash
/implement-tool braiins_hashrate_stats --category simple
/implement-tool braiins_blocks --category parameterized
/implement-tool braiins_mining_overview --category composite
```

**Workflow**:
1. Load braiins-tool-implementation skill
2. Gather context (types, API client, fixtures)
3. Create tool implementation based on category
4. Register tool in MCP server
5. Create unit tests
6. Create integration tests
7. Run tests
8. Update documentation
9. Commit changes

**Outputs**:
- Tool class (`src/tools/${category}/${tool-name}.ts`)
- Unit tests (`tests/unit/tools/${tool-name}.test.ts`)
- Integration tests (`tests/integration/tools/${tool-name}.integration.test.ts`)
- Updated server (`src/index.ts`)
- Updated README.md
- Git commit

**When to Use**:
- After API discovery is complete
- When type definitions exist
- When API client method is implemented
- When ready to create the MCP tool

---

## 🤖 Agents (2 Total)

Agents are specialized role configurations that load appropriate skills for specific tasks.

### 1. api-explorer

**File**: `.claude/agents/api-explorer.md`

**Role**: API Discovery Specialist

**Purpose**: Systematically explore and document Braiins Insights Dashboard API endpoints, discovering undocumented parameters and creating comprehensive type definitions.

**Core Responsibilities**:
1. API Endpoint Discovery
2. Response Structure Analysis
3. Parameter Validation
4. Type Definition Generation
5. Test Fixture Creation
6. Documentation Updates

**Primary Skills**:
- braiins-api-discovery
- braiins-type-system-design

**Deliverables Per Endpoint**:
1. Discovery Report
2. Type Definitions
3. Test Fixtures
4. Updated Documentation

**When to Use**:
- Use this agent for the discovery phase of endpoint implementation
- Before creating MCP tools
- When exploring new API versions
- When documenting API behavior

**Collaboration**:
- Hands off to mcp-tool-builder agent after discovery complete
- Requests architecture review from architect agent when needed

---

### 2. mcp-tool-builder

**File**: `.claude/agents/mcp-tool-builder.md`

**Role**: MCP Tool Implementation Specialist

**Purpose**: Implement production-quality Model Context Protocol (MCP) tools for the Braiins Insights MCP Server following project patterns and best practices.

**Core Responsibilities**:
1. Tool Implementation
2. Input Validation
3. Response Formatting
4. Error Handling
5. Test Creation
6. Tool Registration
7. Documentation

**Primary Skills**:
- braiins-tool-implementation

**Deliverables Per Tool**:
1. Tool Class Implementation
2. Unit Tests (>90% coverage)
3. Integration Tests
4. Updated Server Registration
5. Updated Documentation

**When to Use**:
- Use this agent for the implementation phase after discovery is complete
- When type definitions already exist
- When API client methods are implemented
- When building the actual MCP tools

**Collaboration**:
- Receives handoff from api-explorer agent
- Hands off to validator agent for code review
- Coordinates with scribe agent for documentation

---

## 🔄 Recommended Development Workflows

### Workflow 1: Implement a New MCP Tool (Complete Process)

**Scenario**: You want to add support for a new Braiins Insights API endpoint.

**Steps**:

1. **Discovery Phase** (Use api-explorer agent)
   ```bash
   # Load api-explorer agent
   @.claude/agents/api-explorer.md

   # Run discovery command
   /api-discover /v1.0/new-endpoint
   ```

   **Outputs**:
   - Discovery report
   - Type definitions
   - Test fixtures
   - Updated API.md

2. **API Client Implementation** (Manual or builder agent)
   ```typescript
   // Add method to src/api/insights-client.ts
   async getNewEndpoint(params?: NewEndpointParams): Promise<NewEndpointResponse> {
     return this.get<NewEndpointResponse>('/v1.0/new-endpoint', params);
   }
   ```

3. **Tool Implementation** (Use mcp-tool-builder agent)
   ```bash
   # Load mcp-tool-builder agent
   @.claude/agents/mcp-tool-builder.md

   # Run implement command
   /implement-tool braiins_new_endpoint --category parameterized
   ```

   **Outputs**:
   - Tool class
   - Tests (unit + integration)
   - Updated server registration
   - Updated documentation

4. **Validation** (Use validator agent or manual)
   ```bash
   npm test
   npm run test:integration
   npm run lint
   ```

5. **Commit and Document**
   ```bash
   git add .
   git commit -m "feat(tools): implement braiins_new_endpoint tool"
   ```

**Timeline**: ~2-4 hours per tool (depending on complexity)

---

### Workflow 2: Quick Tool Implementation (Types Already Exist)

**Scenario**: Type definitions and API client method already exist, just need to implement the tool.

**Steps**:

1. **Directly Use Tool Implementation Skill**
   ```markdown
   Load @.claude/skills/braiins-tool-implementation.md

   Implement braiins_existing_endpoint tool as a simple stats tool.
   ```

2. **Create Tests**
   ```markdown
   Create unit and integration tests following the pattern.
   ```

3. **Register and Test**
   ```bash
   npm test
   ```

**Timeline**: ~1-2 hours per tool

---

### Workflow 3: Update Existing Tool

**Scenario**: Need to add new parameters or fix bugs in existing tool.

**Steps**:

1. **Review Discovery (If Needed)**
   ```markdown
   Load @docs/api-discovery/${endpoint-name}.md
   ```

2. **Load Tool Implementation Skill**
   ```markdown
   Load @.claude/skills/braiins-tool-implementation.md
   ```

3. **Update Tool Class**
   ```markdown
   Read @src/tools/${category}/${tool-name}.ts
   Update Zod schema with new parameters
   Update formatAsTable() method if needed
   ```

4. **Update Tests**
   ```markdown
   Read @tests/unit/tools/${tool-name}.test.ts
   Add test cases for new parameters
   ```

5. **Test and Commit**
   ```bash
   npm test
   git commit -m "fix(tools): add ${parameter} support to ${tool_name}"
   ```

**Timeline**: ~30 minutes - 1 hour

---

## 📊 Skills-First Paradigm Benefits

### Why Skills > Multiple Agents

| Aspect | Multiple Agents | Single Agent + Skills |
|--------|-----------------|---------------------|
| **Maintenance** | Update N agents | Update 1 agent + M skills |
| **Token Efficiency** | 15x baseline | 5-7x baseline (35% savings) |
| **Context Management** | Distributed, duplicated | Centralized, progressive |
| **Composability** | Agent coordination overhead | Native skill composition |
| **Sharing** | Copy entire agent configs | Share skill packages |
| **Versioning** | N agent versions | 1 agent + M skill versions |

### When to Use Each Approach

**Skills (Default Choice)**:
- ✅ Sequential workflows
- ✅ Standard development tasks
- ✅ Depth-first problem solving
- ✅ Context-heavy operations

**Multi-Agent (Special Cases)**:
- ✅ Parallel independent research
- ✅ Exploring multiple approaches
- ✅ Breadth-first tasks
- ✅ Scale requiring concurrency

**Hybrid (Complex Features)**:
- ✅ Orchestrator + workers with skills
- ✅ Best of both worlds

### Braiins Insights MCP Server Usage

For this project:
- **Primary**: Use api-explorer and mcp-tool-builder agents with skills
- **Tools**: Implement tools sequentially, not in parallel (context continuity)
- **Composite Tools**: Use single agent loading multiple skills
- **API Discovery**: Sequential per endpoint (builds on previous discoveries)

---

## 🧪 Testing the Skills, Commands, and Agents

### Test Skills Individually

```bash
# Test braiins-api-discovery skill
claude --skill .claude/skills/braiins-api-discovery.md \
  "Discover parameters for /v1.0/hashrate-stats"

# Test braiins-type-system-design skill
claude --skill .claude/skills/braiins-type-system-design.md \
  "Design types for hashrate stats response: $(curl -s https://insights.braiins.com/api/v1.0/hashrate-stats)"

# Test braiins-tool-implementation skill
claude --skill .claude/skills/braiins-tool-implementation.md \
  "Implement simple tool for hashrate stats"
```

### Test Commands

```bash
# In Claude Code CLI
/api-discover /v1.0/hashrate-stats
/implement-tool braiins_hashrate_stats --category simple
```

### Test Agents

```bash
# Load agent configuration
claude --agent .claude/agents/api-explorer.md \
  "Discover parameters for the blocks endpoint"

claude --agent .claude/agents/mcp-tool-builder.md \
  "Implement the braiins_blocks tool"
```

---

## 📝 Maintenance and Updates

### Updating Skills

When updating a skill:

1. Update the skill file (`.claude/skills/*.md`)
2. Update version number in skill frontmatter
3. Document changes in skill's "Version History" section
4. Test skill with real tasks
5. Update this summary document if workflow changes
6. Commit with message: `docs(skills): update ${skill-name} skill v${version}`

### Updating Commands

When updating a command:

1. Update command file (`.claude/commands/*.md`)
2. Update version in frontmatter
3. Test command execution
4. Update this summary document if usage changes
5. Commit with message: `docs(commands): update ${command-name} v${version}`

### Updating Agents

When updating an agent:

1. Update agent file (`.claude/agents/*.md`)
2. Update version number
3. Test agent workflows
4. Update this summary document if responsibilities change
5. Commit with message: `docs(agents): update ${agent-name} agent v${version}`

---

## 🔗 Integration with Claude Code

### Using Skills in Claude Code

1. **Direct Skill Loading**:
   ```markdown
   Load @.claude/skills/braiins-api-discovery.md
   ```

2. **Via Commands**:
   ```bash
   /api-discover /v1.0/blocks
   ```

3. **Via Agents**:
   ```markdown
   @.claude/agents/api-explorer.md

   Please discover parameters for the blocks endpoint.
   ```

### Project-Specific Settings

Add to `.claude/settings.json` (if exists):

```json
{
  "skills": {
    "directory": ".claude/skills",
    "autoload": [
      "braiins-api-discovery",
      "braiins-type-system-design",
      "braiins-tool-implementation"
    ]
  },
  "commands": {
    "directory": ".claude/commands"
  },
  "agents": {
    "directory": ".claude/agents",
    "default": "mcp-tool-builder"
  }
}
```

---

## 📚 References

### Project Documentation
- `README.md` - Project overview
- `AGENTS.md` - Universal development standards
- `CLAUDE.md` - Claude-specific workflow guidance
- `DEVELOPMENT_PLAN.md` - Implementation roadmap
- `ARCHITECTURE.md` - Technical architecture
- `API.md` - API endpoint catalog

### Claude Code Documentation
- [Skills-First Development](https://docs.anthropic.com/claude/skills)
- [Custom Commands](https://docs.anthropic.com/claude/commands)
- [Agent Configuration](https://docs.anthropic.com/claude/agents)

### Template Repository
- [Claude Command and Control](https://github.com/enuno/claude-command-and-control)
- Comprehensive templates and best practices

---

## ✅ Summary Checklist

Use this checklist to verify all assets are properly created and configured:

### Skills
- [x] braiins-api-discovery.md created
- [x] braiins-type-system-design.md created
- [x] braiins-tool-implementation.md created
- [ ] Skills tested with real tasks
- [x] Skills follow skill-creator best practices

### Commands
- [x] api-discover.md created
- [x] implement-tool.md created
- [ ] Commands tested in Claude Code
- [x] Commands reference appropriate skills

### Agents
- [x] api-explorer.md created
- [x] mcp-tool-builder.md created
- [ ] Agents tested with real workflows
- [x] Agents load appropriate skills
- [x] Collaboration protocols defined

### Documentation
- [x] SKILLS_COMMANDS_AGENTS_SUMMARY.md created
- [x] Workflows documented
- [x] Examples provided
- [x] Maintenance procedures defined

### Integration
- [ ] Test skills individually
- [ ] Test commands in real session
- [ ] Test agents with complete workflow
- [ ] Verify all files in correct locations
- [ ] Update project README if needed

---

## 🎯 Next Steps

1. **Test Skills**: Run each skill with a real task to verify functionality
2. **Test Commands**: Execute /api-discover and /implement-tool with actual endpoints
3. **Test Agents**: Run api-explorer and mcp-tool-builder through complete workflow
4. **Document Usage**: Add examples to USAGE_GUIDE.md showing skill usage
5. **Train Team**: Share this summary with team members using Claude Code
6. **Iterate**: Collect feedback and improve skills/commands/agents based on usage

---

**Document Version**: 1.0.0
**Last Updated**: December 13, 2025
**Maintained By**: Braiins Insights MCP Team
**Review Cycle**: After each major milestone or quarterly
