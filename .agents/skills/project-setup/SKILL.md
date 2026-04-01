---
name: project-setup
description: Interactive project configuration — walks through replacing template placeholders with real project values. Run once after cloning the get-sean-done template.
---

# Project Setup

Interactive setup for configuring a new project from the GSD template. This replaces all `{{PLACEHOLDER}}` values across the repo with your actual project configuration.

## When to Use

**Once**, right after cloning the template:

```bash
git clone https://github.com/seantokuzo/get-sean-done.git my-project
cd my-project
rm -rf .git && git init
```

Then tell Claude: _"Read .agents/skills/project-setup/SKILL.md and run through the setup with me"_

## Setup Steps

### Step 1: Gather Project Info

Ask the user for these values (all required):

| Placeholder | Question | Example |
|-------------|----------|---------|
| `{{PROJECT_NAME}}` | "What's your project called?" | `Pulse` |
| `{{PROJECT_DESCRIPTION}}` | "One-liner — what does it do?" | `Real-time analytics dashboard for SaaS metrics` |
| `{{OWNER}}` | "GitHub username or org?" | `seantokuzo` |
| `{{REPO}}` | "GitHub repo name?" | `pulse` |
| `{{GIT_USERNAME}}` | "Your git username (for PR assignment)?" | `seantokuzo` |

### Step 2: Gather Tech Stack (Optional)

These can be filled in now or left as placeholders for later:

| Placeholder | Question |
|-------------|----------|
| `{{FRONTEND_DIR}}` | Frontend directory name (e.g., `web`, `client`, `frontend`) |
| `{{FRONTEND_FRAMEWORK}}` | Framework (e.g., `React 19`, `Svelte 5`, `Vue 3`, `Next.js 15`) |
| `{{FRONTEND_LANGUAGE}}` | Language (e.g., `TypeScript`, `JavaScript`) |
| `{{STATE_MANAGEMENT}}` | State approach (e.g., `Zustand`, `Svelte stores`, `Pinia`) |
| `{{STYLING}}` | Styling (e.g., `Tailwind CSS`, `CSS Modules`, `styled-components`) |
| `{{FRONTEND_TESTING}}` | Test framework (e.g., `Vitest`, `Jest`, `Playwright`) |
| `{{BACKEND_DIR}}` | Backend directory name (e.g., `server`, `api`, `backend`) |
| `{{BACKEND_RUNTIME}}` | Runtime (e.g., `Node.js 22`, `Python 3.12`, `Go 1.22`) |
| `{{BACKEND_LANGUAGE}}` | Language (e.g., `TypeScript`, `Python`, `Go`) |
| `{{BACKEND_FRAMEWORK}}` | Framework (e.g., `Fastify`, `Express`, `FastAPI`, `Gin`) |
| `{{DATABASE}}` | Database (e.g., `PostgreSQL`, `SQLite`, `MongoDB`, `None yet`) |
| `{{BACKEND_TESTING}}` | Test framework (e.g., `Vitest`, `pytest`, `go test`) |
| `{{PACKAGE_MANAGER}}` | Package manager (e.g., `npm`, `pnpm`, `yarn`, `pip`) |
| `{{MONOREPO_TOOL}}` | Monorepo tool (e.g., `turborepo`, `nx`, `none`) |
| `{{API_STYLE}}` | API style (e.g., `REST`, `GraphQL`, `tRPC`, `WebSocket`) |
| `{{SCOPES}}` | Git commit scopes (e.g., `frontend, backend, api, docs`) |

**If they don't know yet:** Leave as `{{PLACEHOLDER}}` — they can fill in during Phase 1 planning.

### Step 3: Find and Replace

Run replacements across all files. Required placeholders first:

```bash
# Find all files with placeholders
grep -r "{{PROJECT_NAME}}\|{{OWNER}}\|{{REPO}}\|{{GIT_USERNAME}}" --include="*.md" --include="*.yml" --include="*.json" --include="*.sh" -l .
```

Replace using the Edit tool for each file, or for bulk replacement:

```bash
# Core replacements (always do these)
find . -type f \( -name "*.md" -o -name "*.yml" -o -name "*.json" -o -name "*.sh" \) \
  -not -path "./.git/*" \
  -exec sed -i '' "s/{{PROJECT_NAME}}/ActualName/g" {} +
```

### Step 4: Agent Role Selection

Ask the user which agent roles they need:

- **orchestrator.md** — Always keep (core to the workflow)
- **researcher.md** — Always keep (research before building)
- **frontend-engineer.md** — Keep if project has a frontend
- **backend-engineer.md** — Keep if project has a backend
- **Custom roles** — Ask if they need domain-specific agents (mobile, DevOps, ML, etc.)

Delete unused agent files. If they need custom roles, use `TEMPLATE.md` to create them.

### Step 5: Configure CI Pipeline

Open `.github/workflows/ci.yml` and help them:
- Uncomment the jobs they need
- Update working directories
- Update build/test/lint commands
- Set the right Node/Python/Go version

### Step 6: Configure Hooks

Open `.claude/hooks/` and help them:
- Set the right formatter in `post-edit-format.sh`
- Review security blocks in `pre-tool-security.sh`
- Test the notification script

### Step 7: First Commit

```bash
git add -A
git commit -m "chore: initialize project from GSD template

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### Step 8: Create GitHub Repo (Optional)

If they want to create the repo now:

```bash
gh repo create {{OWNER}}/{{REPO}} --private --source=. --remote=origin --push
```

## Post-Setup

After setup is complete, the next step is:

```
Read docs/PLANNING.md and CLAUDE.md. Let's plan Phase 1.
```

This transitions into the normal GSD workflow — planning, decomposition, execution.
