---
name: pr-review-pipeline
description: Automated triple-reviewer PR pipeline — Copilot auto-review + @claude + @codex triggers (all on Copilot subscription) with smart merge thresholds. Polls for comments, addresses them, replies inline, and loops until clean. Run after every PR creation.
---

# PR Review Pipeline

Automated multi-round, multi-reviewer code review workflow. After creating a PR, run this pipeline to ensure all review comments are addressed before merge.

## When to Use

**ALWAYS** after creating a PR via `gh pr create`. This is a mandatory step in the workflow.

## Reviewers

All three reviewers run on your **GitHub Copilot subscription** — zero Anthropic API cost.

| Reviewer | How It Triggers | What It's Good At |
|----------|----------------|-------------------|
| **GitHub Copilot** | Auto-requested via repo settings | General code quality, patterns, bugs |
| **@claude** | Comment posted on PR by agent | Deep reasoning, security, architecture |
| **@codex** | Comment posted on PR by agent | Performance, optimization, code smells |

### Setup: Enable Copilot Auto-Review

In your GitHub repo: **Settings > Copilot > Code Review > Enable automatic review requests**

This makes Copilot auto-review every PR. The `@claude` and `@codex` reviews are triggered by comments posted as part of this pipeline.

## Pipeline Steps

### Step 1: Trigger All Reviewers

After creating the PR, immediately post comments to trigger the additional reviewers:

```bash
# Copilot auto-reviews (already triggered by PR creation if configured)

# Trigger @claude review (uses Copilot subscription)
gh pr comment {PR_NUMBER} --body "@claude Review this entire PR. Focus on:
- Bugs and logic errors
- Security vulnerabilities
- Adherence to project conventions in CLAUDE.md
- Missing error handling or edge cases"

# Trigger @codex review (uses Copilot subscription)
gh pr comment {PR_NUMBER} --body "@codex Review this entire PR. Focus on:
- Performance issues and optimization opportunities
- Code smells and maintainability
- Unused code or imports
- Type safety concerns"
```

### Step 2: Wait for Reviews

All three reviewers need time to analyze the PR.

```bash
# Poll every 30s for up to 5 minutes (three reviewers need time)
for i in {1..10}; do
  COMMENTS=$(gh api repos/seantokuzo/u-suck-at-money/pulls/{PR_NUMBER}/comments --jq 'length')
  REVIEWS=$(gh api repos/seantokuzo/u-suck-at-money/pulls/{PR_NUMBER}/reviews --jq 'length')
  if [ "$COMMENTS" -gt 0 ] || [ "$REVIEWS" -gt 0 ]; then
    echo "Found $COMMENTS inline comments and $REVIEWS reviews"
    break
  fi
  echo "Waiting for reviews... (attempt $i/10)"
  sleep 30
done
```

### Step 3: Read All Comments

```bash
# Get all review comments (inline on diff)
gh api repos/seantokuzo/u-suck-at-money/pulls/{PR_NUMBER}/comments \
  --jq '.[] | select(.in_reply_to_id == null) | {id, user: .user.login, path, line: (.line // .original_line), body: (.body | split("\n")[0])}'
```

Focus on **top-level comments only** (not replies from previous fix rounds).

### Step 4: Calculate Smart Threshold

Determine the comment threshold based on PR size:

```bash
# Get PR stats
STATS=$(gh pr view {PR_NUMBER} --json additions,deletions,changedFiles)
ADDITIONS=$(echo "$STATS" | jq '.additions')
DELETIONS=$(echo "$STATS" | jq '.deletions')
CHANGED_FILES=$(echo "$STATS" | jq '.changedFiles')
TOTAL_LINES=$((ADDITIONS + DELETIONS))

# Smart threshold calculation
if [ "$TOTAL_LINES" -lt 100 ] && [ "$CHANGED_FILES" -lt 5 ]; then
  THRESHOLD=3    # Small PR
  SIZE="small"
elif [ "$TOTAL_LINES" -lt 500 ] && [ "$CHANGED_FILES" -lt 15 ]; then
  THRESHOLD=5    # Medium PR
  SIZE="medium"
else
  THRESHOLD=8    # Large PR
  SIZE="large"
fi

echo "PR size: $SIZE ($TOTAL_LINES lines, $CHANGED_FILES files) — threshold: $THRESHOLD comments"
```

### Step 5: Categorize & Fix Every Comment

For each comment, categorize and act:

| Category | Action | When to Use |
|----------|--------|-------------|
| **fix-now** | Fix in current PR | Real bugs, type errors, security issues |
| **respond** | Reply explaining why no change | Intentional design, false positives, not applicable |
| **defer** | Acknowledge, note for later | Valid but out of scope for this PR |

**Critical: Be skeptical.** You have MORE context than the reviewers. Before accepting a suggestion:

1. Does this apply to our setup?
2. Is this already handled elsewhere?
3. Is this a real problem or theoretical?
4. Does the fix add complexity for marginal benefit?
5. Would a human reviewer with full project context make this same comment?

### Step 6: Build Verify

After all fixes, verify nothing is broken:

```bash
# Run the full CI pipeline locally (adapt to your stack)
# See .github/instructions/ci.instructions.md for project-specific commands
```

### Step 7: Commit and Push

```bash
git add -A && git commit -m "$(cat <<'EOF'
fix(scope): address round N review comments

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
git push origin {BRANCH}
```

### Step 8: Reply Inline to Every Comment

Reply to EACH comment in its own thread (never as unlinked PR comments):

```bash
# Fixed
gh api repos/seantokuzo/u-suck-at-money/pulls/{PR_NUMBER}/comments/{COMMENT_ID}/replies \
  -f body="Fixed — {brief description of what was done}"

# Not applicable
gh api repos/seantokuzo/u-suck-at-money/pulls/{PR_NUMBER}/comments/{COMMENT_ID}/replies \
  -f body="Not applicable — {specific reason why this doesn't apply}"

# Deferred
gh api repos/seantokuzo/u-suck-at-money/pulls/{PR_NUMBER}/comments/{COMMENT_ID}/replies \
  -f body="Deferred — tracked as GitHub Issue for future work"
```

### Step 9: Smart Threshold Check

After addressing all comments, check whether to request another round:

```bash
ROUND_COMMENTS={number of top-level comments this round}

if [ "$ROUND_COMMENTS" -eq 0 ]; then
  echo "CLEAN ROUND — eligible for merge"
elif [ "$ROUND_COMMENTS" -le "$THRESHOLD" ]; then
  echo "Under threshold ($ROUND_COMMENTS <= $THRESHOLD) — address and proceed"
else
  echo "Over threshold ($ROUND_COMMENTS > $THRESHOLD) — requesting another review round"
  # Push fixes will auto-trigger Copilot re-review
  # Re-trigger @claude and @codex for fresh review of fixes:
  gh pr comment {PR_NUMBER} --body "@claude Review the latest changes addressing previous review comments."
  gh pr comment {PR_NUMBER} --body "@codex Review the latest changes addressing previous review comments."
fi
```

### Step 10: Repeat (Minimum 3 Rounds)

The pipeline requires a **minimum of 3 rounds** before merge is eligible:

| Round | Reviewers | Purpose |
|-------|-----------|---------|
| 1 | Copilot + @claude + @codex | Initial review — three AI perspectives |
| 2 | Copilot (auto) + @claude/@codex (if over threshold) | Review fixes, catch regressions |
| 3+ | As needed based on threshold | Final polish |

**Merge eligibility:**
- Minimum 3 rounds completed
- Last round is either clean (0 new comments) OR under threshold
- All CI checks passing
- All inline comments replied to

If still getting significant comments after round 3, report to user with summary.

### Step 11: Merge

After merge eligibility is met:

```bash
gh pr merge {PR_NUMBER} --merge --delete-branch
```

Then pull the merged changes to local main:

```bash
git checkout main && git pull origin main
```

Report the result:

```
PR #{NUMBER} merged after {N} review rounds:
- Round 1: {X} comments (Copilot: {a}, @claude: {b}, @codex: {c})
- Round 2: {Y} comments addressed
- Round 3: Clean pass → merged
- PR size: {SIZE} ({LINES} lines, {FILES} files), threshold: {THRESHOLD}
```

## Reply Format

When replying to comments, be specific:

- "Fixed — added null guard before property access"
- "Fixed — using constant instead of magic number"
- "Not applicable — this endpoint is internal-only, auth is handled by middleware upstream"
- "Deferred — tracked in Issue #XX for Phase N"
- "Intentional — see PLANNING.md section X for design rationale"

## GitHub API Reference

```bash
# List PR inline comments (review comments on diff)
gh api repos/seantokuzo/u-suck-at-money/pulls/{PR}/comments

# Reply to a specific comment (in its thread)
gh api repos/seantokuzo/u-suck-at-money/pulls/{PR}/comments/{ID}/replies -f body="..."

# List PR reviews (approve/request changes)
gh api repos/seantokuzo/u-suck-at-money/pulls/{PR}/reviews

# Check PR status
gh pr view {PR} --json mergeable,mergeStateStatus,statusCheckRollup

# Get PR size stats
gh pr view {PR} --json additions,deletions,changedFiles

# Trigger @claude review
gh pr comment {PR} --body "@claude Review this PR for bugs and security issues"

# Trigger @codex review
gh pr comment {PR} --body "@codex Review this PR for performance and code quality"
```
