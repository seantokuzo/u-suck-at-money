# {{PROJECT_NAME}} — Project Instructions

> Extends global `~/.claude/CLAUDE.md`. Project-specific rules live here.

---

## Project Overview

{{PROJECT_DESCRIPTION}}

See [docs/PLANNING.md](docs/PLANNING.md) for architecture, specs, and roadmap.

---

## Before You Code

1. **Read the planning doc** — `docs/PLANNING.md` is the source of truth for architecture and design
2. **Read relevant skills** — Use the `Read` tool on `.agents/skills/` before implementing any feature
3. **Check Context7** — For ALL library APIs. Never trust training data.
4. **Check package versions** — `npm view <package> version` / `pip show <package>` before adding dependencies
5. **Read agent files** — `.agents/agents/` contains role-specific guidance for each component

---

## Tech Stack & Conventions

<!-- CUSTOMIZE: Replace with your project's tech stack -->

### Frontend (`{{FRONTEND_DIR}}/`)

| Concern | Convention |
|---------|-----------|
| Framework | {{FRONTEND_FRAMEWORK}} |
| Language | {{FRONTEND_LANGUAGE}} |
| State mgmt | {{STATE_MANAGEMENT}} |
| Styling | {{STYLING}} |
| Testing | {{FRONTEND_TESTING}} |

### Backend (`{{BACKEND_DIR}}/`)

| Concern | Convention |
|---------|-----------|
| Runtime | {{BACKEND_RUNTIME}} |
| Language | {{BACKEND_LANGUAGE}} |
| Framework | {{BACKEND_FRAMEWORK}} |
| Database | {{DATABASE}} |
| Testing | {{BACKEND_TESTING}} |

### Cross-Cutting

| Concern | Convention |
|---------|-----------|
| Package manager | {{PACKAGE_MANAGER}} |
| Monorepo tool | {{MONOREPO_TOOL}} (if applicable) |
| API style | {{API_STYLE}} (REST / GraphQL / tRPC / WebSocket) |
| IDs | UUID v4 |
| Dates | ISO 8601 strings in protocol, native types internally |

---

## Git Conventions

- **Atomic commits** — one logical change per commit
- **Commit format** — `type(scope): description`
- **Types** — `feat`, `fix`, `refactor`, `docs`, `test`, `chore`
- **Scopes** — {{SCOPES}} (e.g., `frontend`, `backend`, `api`, `docs`)
- **Branch naming** — `phase-N/feature-name` for phase work, `fix/description` for bugs

---

## Agent Workflow

This project uses a **thin orchestrator, fat workers** pattern:

1. **Orchestrator** stays lean — discovers work, groups into parallel waves, spawns subagents
2. **Subagents** get fresh context — each handles one domain
3. **No nesting** — subagents never spawn sub-subagents
4. **Atomic tasks** — one task = one commit
5. **PR review pipeline** — after every PR, run the automated review loop
6. **Smart merge** — merge is earned after the review pipeline passes clean

### Context Management

- Keep main orchestrator context under 50% capacity
- Spawn subagents for any task touching 5+ files
- Pass file **paths** to subagents, not file contents
- Use agent files in `.agents/agents/` for role-specific prompts

### Agent Roles

| Agent | Role | Scope |
|-------|------|-------|
| `orchestrator.md` | Thin coordinator | Task decomposition, wave scheduling |
| `researcher.md` | Research specialist | Context7, docs, API investigation |
| `frontend-engineer.md` | Frontend specialist | UI, components, client-side logic |
| `backend-engineer.md` | Backend specialist | Server, API, data layer |

<!-- Add custom specialists as needed — see .agents/agents/TEMPLATE.md -->

---

## Quality Gates

Before marking any task complete:

1. **Code compiles** — no type errors, no build failures
2. **Tests pass** — existing and new tests green
3. **No regressions** — existing functionality still works
4. **Convention compliance** — follows the conventions in this file
5. **Security** — no secrets in code, no sensitive data in logs

---

## What NOT To Do

<!-- CUSTOMIZE: Add project-specific anti-patterns -->

- Don't guess library APIs — always verify with Context7
- Don't guess package versions — always check with package manager
- Don't nest subagents (orchestrator -> workers, never workers -> sub-workers)
- Don't paste file contents into agent prompts (pass paths instead)
- Don't skip the PR review pipeline
- Don't push code that hasn't passed CI locally

---

## Self-Improvement (Meta-Rules)

When Claude makes a mistake or you correct its behavior:

1. **Identify the rule** — What instruction was missed or doesn't exist?
2. **Add it here** — Update this file with the specific rule
3. **Be precise** — "Always use X when Y" not "Try to remember X"
4. **Include context** — Why does this rule exist? What went wrong?

This file is a living document. Every correction makes future sessions better.

<important if="you are writing or modifying tests">
<!-- CUSTOMIZE: Add test-specific rules -->
<!-- Example: Always use vitest, never jest. Mock at service boundaries only. -->
</important>

<important if="you are writing or modifying API endpoints">
<!-- CUSTOMIZE: Add API-specific rules -->
<!-- Example: All endpoints must validate input with zod schemas. -->
</important>
