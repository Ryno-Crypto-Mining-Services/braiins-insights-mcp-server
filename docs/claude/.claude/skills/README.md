# Skills Registry

This directory contains the skills registry for dynamic skill discovery and loading by the general agent.

## Purpose

The skills registry enables the **skills-first paradigm** where a general-purpose agent dynamically loads capabilities as modular skills rather than using specialized agent instances for each task.

## How Skills Work

### 1. Skill Discovery

The general agent references `registry.json` to:
- Find available skills by category
- Identify appropriate skills based on triggers
- Understand skill purpose and capabilities

### 2. Progressive Loading

Skills are loaded **progressively** as needed:

```
Feature Implementation Example:
1. architect-skill (design phase)
2. builder-skill (implementation phase)
3. validator-skill (testing phase)
4. scribe-skill (documentation phase)

Result: 35% token reduction vs loading all capabilities upfront
```

### 3. Skill Composition

Multiple skills can be composed for complex workflows:

```
Bug Fix Example:
- root-cause-tracing + builder-skill (investigate + fix)
- validator-skill (add regression tests)
- documentation-update (update docs)
```

## Available Skills

### By Category

- **API Development** (3 skills): braiins-api-discovery, braiins-type-system-design, braiins-tool-implementation
- **Meta** (4 skills): skill-creator, skill-orchestrator, agent-skill-bridge, using-superpowers
- **Development** (2 skills): using-git-worktrees, subagent-driven-development
- **Debugging** (1 skill): root-cause-tracing
- **Maintenance** (1 skill): documentation-update
- **Writing** (1 skill): content-research-writer
- **Integration** (1 skill): file-categorization
- **Orchestration** (4 skills): multi-agent-planner, parallel-executor, worktree-manager, agent-communication

### By Use Case

**Feature Implementation**:
```bash
# Will use builder-role-skill (Phase 4 - in progress)
# Currently falls back to general development patterns
```

**Bug Investigation**:
```bash
# Use root-cause-tracing skill
```

**Documentation**:
```bash
# Use scribe-role-skill (Phase 4 - in progress)
# Currently: documentation-update for repo docs
```

**Multi-Agent Orchestration**:
```bash
# Use orchestration skills when parallelization needed
```

## Braiins Insights MCP Server - Project-Specific Skills

This project includes three specialized skills for developing the Braiins Insights MCP Server:

### 1. braiins-api-discovery

**Purpose**: Systematically explore Braiins Insights Dashboard API endpoints to discover undocumented parameters, validate response structures, and generate comprehensive type definitions.

**When to Use**:
- Discovering undocumented query parameters for an endpoint
- Validating API response structures against type definitions
- Testing new or unknown API endpoints
- Generating fixtures for integration tests
- Before implementing a new MCP tool

**Workflow**:
1. Test baseline endpoint (no parameters)
2. Systematic parameter discovery (pagination, date filtering, sorting)
3. Edge case and error testing
4. Generate discovery report, test fixtures, and type definitions

**Outputs**:
- Discovery report: `docs/api-discovery/{endpoint-name}.md`
- Test fixtures: `tests/integration/fixtures/{endpoint-name}.json`
- Type definitions: `src/types/insights-api.ts`

**Command**: `/api-discover <endpoint-path>`

### 2. braiins-type-system-design

**Purpose**: Design comprehensive TypeScript type systems for Braiins Insights API responses with hierarchical interfaces, JSDoc documentation, and runtime validation.

**When to Use**:
- Creating initial type definitions for new API endpoints
- Updating types after API discovery reveals new fields
- Designing type hierarchies for related endpoints
- Creating runtime type guards for validation
- Generating Zod schemas from TypeScript interfaces

**Workflow**:
1. Analyze raw API response structure
2. Design TypeScript interfaces with JSDoc
3. Create query parameter types
4. Create runtime type guards
5. Create Zod schemas (optional)
6. Design type hierarchies

**Outputs**:
- TypeScript interfaces: `src/types/insights-api.ts`
- Type guards: `isHashrateStats()`, etc.
- Zod schemas: `HashrateStatsSchema`, etc.

**Used By**: `/api-discover`, `/implement-tool`

### 3. braiins-tool-implementation

**Purpose**: Implement production-quality MCP tools for Braiins Insights API endpoints with input validation, response formatting, error handling, and comprehensive tests.

**When to Use**:
- Implementing new MCP tools for Braiins Insights endpoints
- Creating simple stats tools (no parameters)
- Creating parameterized tools (with input validation)
- Creating historical data tools (time-series)
- Creating composite tools (multi-endpoint aggregators)

**Tool Categories**:
- **Simple Stats**: No parameters, returns current statistics
- **Parameterized**: Accepts input parameters with Zod validation
- **Historical**: Returns time-series data
- **Composite**: Aggregates multiple endpoints

**Workflow**:
1. Define tool class (name, description, inputSchema)
2. Implement execute() method with error handling
3. Format response as LLM-friendly markdown
4. Register tool in MCP server
5. Create unit tests (>90% coverage)
6. Create integration tests
7. Update documentation

**Outputs**:
- Tool class: `src/tools/{category}/{tool-name}.ts`
- Unit tests: `tests/unit/tools/{tool-name}.test.ts`
- Integration tests: `tests/integration/tools/{tool-name}.integration.test.ts`

**Command**: `/implement-tool <tool-name> --category <simple|parameterized|historical|composite>`

### Workflow Example: Complete Tool Implementation

```bash
# 1. Discover API endpoint
/api-discover /v1.0/hashrate-stats

# Output:
# - docs/api-discovery/hashrate-stats.md
# - tests/integration/fixtures/hashrate-stats.json
# - src/types/insights-api.ts (updated)

# 2. Implement API client method (manual)
# Edit src/api/insights-client.ts

# 3. Implement MCP tool
/implement-tool braiins_hashrate_stats --category simple

# Output:
# - src/tools/simple/hashrate-stats.ts
# - tests/unit/tools/hashrate-stats.test.ts
# - tests/integration/tools/hashrate-stats.integration.test.ts
# - src/index.ts (updated)
# - README.md (updated)

# 4. Test
npm test
npm run test:integration
```

## Registry Structure

```json
{
  "skills": [
    {
      "name": "skill-name",
      "path": "../../skills/skill-name",
      "category": "category-name",
      "description": "What this skill does",
      "triggers": ["phrases that activate this skill"]
    }
  ]
}
```

## When to Create New Skills

Create a new skill when:
- Workflow repeats **≥3 times per week**
- Multiple team members would benefit
- Pattern is project-agnostic
- Clear trigger conditions exist

Use `skill-creator` skill to create new skills:
```
"Use skill-creator skill to help me build a skill for [your workflow]"
```

## Skill Development Status

### ✅ Production Skills (Active)

**Project-Specific (Braiins Insights MCP Server)**:
- braiins-api-discovery
- braiins-type-system-design
- braiins-tool-implementation

**General Purpose**:
- skill-creator
- documentation-update
- using-git-worktrees
- root-cause-tracing
- file-categorization
- content-research-writer
- skill-orchestrator
- subagent-driven-development
- agent-skill-bridge
- using-superpowers

### 🚧 Orchestration Skills (Templates)
- multi-agent-planner-skill
- parallel-executor-skill
- worktree-manager-skill
- agent-communication-skill

### 📋 Phase 4: Agent → Skill Conversions (Planned)
- builder-role-skill
- validator-role-skill
- architect-role-skill
- scribe-role-skill
- devops-role-skill
- researcher-role-skill

## References

- **Skills Directory**: `../../skills/`
- **Skills Templates**: `../../skills-templates/`
- **Agent Skills Guide**: `../../docs/best-practices/09-Agent-Skills-vs-Multi-Agent.md`
- **Skills Guide**: `../../docs/best-practices/08-Claude-Skills-Guide.md`

## Maintenance

This registry is automatically updated when:
- New skills are added to `/skills/` directory
- Skills are removed or deprecated
- Skill metadata changes

**Last Updated**: 2025-12-13
**Version**: 1.1.0
**Maintained By**: Braiins Insights MCP Team (based on Claude Command and Control Project)
