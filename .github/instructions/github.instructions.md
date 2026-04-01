---
applyTo: "**/*"
---

# GitHub Integration

## Repository Details

| Property | Value |
|----------|-------|
| **Owner** | `{{OWNER}}` |
| **Repo** | `{{REPO}}` |
| **URL** | https://github.com/{{OWNER}}/{{REPO}} |
| **PRs** | https://github.com/{{OWNER}}/{{REPO}}/pulls |
| **Default Branch** | `main` |
| **Username** | `{{GIT_USERNAME}}` |

## Branch Strategy

| Scope | Branch Pattern | Example |
|-------|---------------|---------|
| **Phase work** | `phase-N/feature-name` | `phase-1/auth-scaffold` |
| **Bug fix** | `fix/description` | `fix/login-redirect` |
| **Docs** | `docs/description` | `docs/api-spec` |

### Commit Convention

```
type(scope): description
```

**Types**: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`
**Scopes**: {{SCOPES}}

Examples:

```bash
git commit -m "feat(backend): add auth middleware"
git commit -m "fix(frontend): handle empty state in dashboard"
git commit -m "test(backend): add integration tests for auth flow"
```

### PR Naming

```
Phase N: description
```

For bug fixes or non-phase work:

```
fix: description of the fix
```

## PR Setup (ALL MANDATORY)

When creating a PR:

1. **Create PR** (not draft)
2. **Assign `@{{GIT_USERNAME}}`**
3. **Apply labels**: component + type + `Needs Review`
4. **Copilot + Claude Code Action auto-review** (triggered automatically)
5. **Run PR review pipeline** (`.agents/skills/pr-review-pipeline/SKILL.md`)

## PR Labels

### Component Labels (based on files changed)

| Label | When to Apply |
|-------|-------------|
| **Frontend** | Changes to `{{FRONTEND_DIR}}/` |
| **Backend** | Changes to `{{BACKEND_DIR}}/` |
| **Docs** | Documentation changes |

### Type Labels

| Label | When to Apply |
|-------|-------------|
| **Bug Fix** | Fixing a bug |
| **Breaking Change** | Breaking API or protocol changes |

### Status Labels

| Label | When to Apply |
|-------|-------------|
| **Needs Review** | PR ready for review (agent applies) |
| **Accepted** | Human approved, ready to merge |

### CI Labels (auto-applied by GitHub Actions)

| Label | Trigger |
|-------|---------|
| **Lint Failure** | Lint job fails |
| **Type Error** | Typecheck job fails |
| **Test Failure** | Test job fails |
| **Build Failure** | Build job fails |
| **CI Pass** | All jobs pass |

## PR Template

**ALWAYS** use the PR template at `.github/PULL_REQUEST_TEMPLATE.md`. Fill in ALL sections.

## MCP Tools for GitHub

### Creating PRs

```
mcp__github__create_pull_request
- owner: "{{OWNER}}"
- repo: "{{REPO}}"
- title: "Phase 1: Feature description"
- body: "## Summary\n..."
- head: "phase-1/feature-name"
- base: "main"
```

### Reading PR Comments

```bash
# Get all review comments
gh api repos/{{OWNER}}/{{REPO}}/pulls/{number}/comments

# Reply to a specific comment
gh api repos/{{OWNER}}/{{REPO}}/pulls/{number}/comments/{comment_id}/replies \
  -f body="Fixed in abc123"
```
