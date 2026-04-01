# Get Sean Done (GSD)

> A battle-tested workflow template for shipping software with AI agents. Clone it, configure it, start building.

---

## What Is This?

GSD is a **complete development workflow system** designed for working with Claude Code (and AI coding agents in general). It's the extracted, generalized, and enhanced version of the workflow that shipped [Major Tom](https://github.com/seantokuzo/major-tom) — 10 phases, 85+ PRs, thousands of commits — with a single developer and an AI agent team.

This isn't a toy setup or a blog post example. This is the actual system, battle-hardened across months of real development.

**The philosophy:** You are the architect and planning partner. Claude is the engineering team. This template gives Claude everything it needs to operate autonomously — planning, executing, reviewing, merging — while you stay in the driver's seat.

---

## What's Inside

```
get-sean-done/
├── CLAUDE.md                              # Project instructions (the brain)
├── .agents/
│   ├── agents/                            # Specialist roles
│   │   ├── orchestrator.md                # Thin coordinator — decomposes & dispatches
│   │   ├── researcher.md                  # Investigates APIs, libraries, feasibility
│   │   ├── frontend-engineer.md           # Frontend specialist template
│   │   ├── backend-engineer.md            # Backend specialist template
│   │   └── TEMPLATE.md                    # Create your own specialist
│   └── skills/                            # On-demand knowledge modules
│       ├── pr-review-pipeline/            # Automated multi-reviewer PR review
│       ├── project-setup/                 # Interactive project configuration
│       ├── roadmap-management/            # Phase-based planning frameworks
│       └── find-skills/                   # Discover & install community skills
├── .github/
│   ├── instructions/                      # GitHub Copilot / AI assistant rules
│   │   ├── workflow.instructions.md       # The GSD development loop
│   │   ├── ci.instructions.md             # Pre-push quality gates
│   │   ├── github.instructions.md         # Branch, commit, PR conventions
│   │   └── pr-review.instructions.md      # How to handle review comments
│   ├── workflows/
│   │   ├── ci.yml                         # Template CI pipeline
│   │   └── claude-review.yml              # Claude Code Action auto-review
│   ├── PULL_REQUEST_TEMPLATE.md           # Standardized PR format
│   └── copilot-instructions.md            # Copilot personality & context
├── .claude/
│   ├── settings.local.json                # Permission allowlist
│   ├── rules/                             # Path-scoped rules (progressive disclosure)
│   │   ├── README.md                      # How to write rules
│   │   ├── example-frontend.md            # Frontend-specific rules
│   │   └── example-backend.md             # Backend-specific rules
│   └── hooks/                             # Deterministic automation
│       ├── post-edit-format.sh            # Auto-format on every edit
│       ├── pre-tool-security.sh           # Block dangerous operations
│       └── post-response-notify.sh        # macOS notification on completion
├── docs/
│   ├── PLANNING.md                        # Architecture & roadmap template
│   ├── STATE.md                           # Session state tracking
│   └── SESSION-GUIDE.md                   # Human operator playbook
└── .gitignore
```

---

## The Workflow

### The Loop

```
PLAN → RESEARCH → EXECUTE → REVIEW → MERGE → REPEAT
  │                  │          │
  │    ┌─────────────┤          │
  │    │  Wave 1     │     Copilot Review
  │    │  (parallel) │     Claude Review
  │    │             │     Smart Thresholds
  │    ├─────────────┤          │
  │    │  Wave 2     │     Address Comments
  │    │  (parallel) │     Reply Inline
  │    └─────────────┘          │
  │                             │
  └─── Update Plan ◄───────────┘
```

### How It Works

1. **You plan together** — Discuss the next phase, agree on scope and approach
2. **Claude decomposes** — The orchestrator breaks work into atomic tasks grouped by dependency waves
3. **Specialists execute** — Each wave spawns parallel subagents (frontend, backend, etc.) with fresh context
4. **Quality gates** — Code compiles, tests pass, conventions followed, CI green
5. **PR + dual review** — Copilot and Claude Code Action both review automatically
6. **Smart merge** — Comments addressed, thresholds met, auto-merge after clean rounds
7. **Rinse and repeat** — Update the plan, move to next phase

### Context Management

The secret sauce. Context rot kills AI quality. GSD prevents it:

| Signal | Threshold | Action |
|--------|-----------|--------|
| Files per task | 5-8 max | 15+ = spawn subagent |
| Sequential tasks | 2-3 max | 5+ = parallelize |
| Context feel | Light | Heavy = fresh session |

**Thin orchestrator, fat workers.** The coordinator stays lean. Workers get fresh context with only the files they need.

---

## Getting Started

### 1. Clone the template

```bash
git clone https://github.com/seantokuzo/get-sean-done.git my-project
cd my-project
rm -rf .git && git init
```

### 2. Run the setup skill

Open Claude Code in the project and say:

```
Read .agents/skills/project-setup/SKILL.md and run through the setup with me
```

Claude will walk you through:
- Project name and description
- GitHub owner/repo configuration
- Which agent roles to keep/customize
- Placeholder replacement across all files

### 3. Start planning

```
Read docs/PLANNING.md and CLAUDE.md. Let's plan Phase 1.
```

### 4. Start building

```
Read .agents/agents/orchestrator.md. Execute Phase 1.
```

---

## Key Concepts

### Phases

Work is organized into **phases** — each delivers an observable user capability. No sprints, no story points, no ceremonies. Just: "What can the user do after this phase ships?"

### Waves

Within a phase, tasks are grouped into **dependency waves**. Wave 1 tasks are independent and run in parallel. Wave 2 tasks depend on Wave 1 outputs. This maximizes throughput.

### Agent Roles

Specialist agents with focused context and clear responsibilities:

| Role | Purpose |
|------|---------|
| **Orchestrator** | Decomposes work, spawns specialists, tracks progress |
| **Researcher** | Investigates APIs and feasibility before building |
| **Frontend Engineer** | UI/UX implementation |
| **Backend Engineer** | Server, API, data layer |
| **Custom Specialists** | Add your own using `TEMPLATE.md` |

### Skills (Progressive Disclosure)

Skills are knowledge modules loaded on-demand. They keep CLAUDE.md lean by only pulling in context when it's relevant:

- **PR Review Pipeline** — Automated multi-round review with smart merge thresholds
- **Project Setup** — Interactive configuration wizard
- **Roadmap Management** — Phase planning and prioritization frameworks
- **Find Skills** — Discover community skills via `npx skills find`

### Hooks (Deterministic Enforcement)

Shell scripts that run automatically on Claude Code events:

- **Auto-format** — Every file edit gets formatted (prettier, black, swiftformat, whatever)
- **Security gate** — Blocks reading .env files, secrets, credentials
- **Notifications** — macOS alert when Claude finishes a task

### Path-Scoped Rules

Rules in `.claude/rules/` only activate when Claude reads files matching the path pattern. Frontend rules fire for frontend code, backend rules fire for backend code. No wasted context.

### Dual AI Review

Every PR gets reviewed by **both Copilot and Claude Code Action**. Smart thresholds based on PR size determine when to request additional rounds vs. merge. Minimum 3 rounds ensures thoroughness.

---

## Session Management

See [`docs/SESSION-GUIDE.md`](docs/SESSION-GUIDE.md) for the complete human operator playbook, including:

- When to start fresh sessions
- Prompts to paste to get Claude rolling
- How to manage context exhaustion
- The planning partner workflow

---

## Customization

### Adding Agent Roles

Copy `.agents/agents/TEMPLATE.md`, fill in the sections, reference it from the orchestrator.

### Adding Skills

Use `npx skills find <query>` or create your own in `.agents/skills/<name>/SKILL.md`.

### Adding Rules

Create files in `.claude/rules/` with path-scoped frontmatter:

```yaml
---
paths: ["src/api/**/*.ts"]
---
Your rules here...
```

### Modifying the CI Pipeline

Edit `.github/workflows/ci.yml` — uncomment and configure the jobs for your stack.

---

## Inspiration & Credits

This workflow was built on ideas from:

- **GSD (Get Shit Done)** — Meta-prompting and context engineering patterns
- **Boris Cherny** (Anthropic) — CLAUDE.md best practices, self-improvement loops
- **Addy Osmani** — Code Agent Orchestra, multi-agent parallelization
- **incident.io** — Git worktree isolation for parallel AI agents
- **HumanLayer** — WHAT/WHY/HOW CLAUDE.md structure
- **claude-meta** — Self-improving rule generation
- **The Claude Code community** — awesome-claude-code, skills ecosystem

---

## License

MIT — Use it, fork it, make it yours.

---

*Built with Claude Code. Shipped by humans who refuse to do things the slow way.*
