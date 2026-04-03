---
name: pr-review-pipeline
description: Automated PR review pipeline using GitHub Copilot auto-review with smart merge thresholds. Polls for comments, addresses them, replies inline, and loops until clean. Run after every PR creation.
---

# PR Review Pipeline

Automated multi-round code review workflow using GitHub Copilot. After creating a PR, run this pipeline to ensure all review comments are addressed before merge.

## When to Use

**ALWAYS** after creating a PR via `gh pr create`. This is a mandatory step in the workflow.

## Reviewer

| Reviewer | How It Triggers | What It's Good At |
|----------|----------------|-------------------|
| **GitHub Copilot** | Auto-requested via repo settings | Code quality, bugs, patterns, security, performance |

### Setup: Enable Copilot Auto-Review

In your GitHub repo: **Settings > Copilot > Code Review > Enable automatic review requests**

This makes Copilot auto-review every PR on open/synchronize. No extra API keys needed — runs on your Copilot subscription.

> **Note:** Copilot code review is a single-model system. You cannot @mention other AI models
> (e.g. @claude, @codex) in PR comments to trigger alternative reviews. If you want additional
> AI reviewers, set them up as separate GitHub Actions with their own API keys.

## Pipeline Steps

### Step 1: Wait for Copilot Review

After creating the PR, Copilot auto-reviews (if enabled). Poll for comments:

```bash
# Poll every 30s for up to 5 minutes
for i in {1..10}; do
  COMMENTS=$(gh api repos/{OWNER}/{REPO}/pulls/{PR_NUMBER}/comments --jq 'length')
  REVIEWS=$(gh api repos/{OWNER}/{REPO}/pulls/{PR_NUMBER}/reviews --jq 'length')
  if [ "$COMMENTS" -gt 0 ] || [ "$REVIEWS" -gt 0 ]; then
    echo "Found $COMMENTS inline comments and $REVIEWS reviews"
    break
  fi
  echo "Waiting for reviews... (attempt $i/10)"
  sleep 30
done
```

### Step 2: Read All Comments

```bash
# Get all review comments (inline on diff)
gh api repos/{OWNER}/{REPO}/pulls/{PR_NUMBER}/comments \
  --jq '.[] | select(.in_reply_to_id == null) | {id, user: .user.login, path, line: (.line // .original_line), body: (.body | split("\n")[0])}'
```

Focus on **top-level comments only** (not replies from previous fix rounds).

### Step 3: Calculate Smart Threshold

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

### Step 4: Categorize & Fix Every Comment

For each comment, categorize and act:

| Category | Action | When to Use |
|----------|--------|-------------|
| **fix-now** | Fix in current PR | Real bugs, type errors, security issues |
| **respond** | Reply explaining why no change | Intentional design, false positives, not applicable |
| **defer** | Acknowledge, note for later | Valid but out of scope for this PR |

**Critical: Be skeptical.** You have MORE context than the reviewer. Before accepting a suggestion:

1. Does this apply to our setup?
2. Is this already handled elsewhere?
3. Is this a real problem or theoretical?
4. Does the fix add complexity for marginal benefit?
5. Would a human reviewer with full project context make this same comment?

### Step 5: Build Verify

After all fixes, verify nothing is broken:

```bash
npx tsc --noEmit
```

### Step 6: Commit and Push

```bash
git add -A && git commit -m "$(cat <<'EOF'
fix(scope): address round N review comments

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
git push origin {BRANCH}
```

### Step 7: Reply Inline to Every Comment

Reply to EACH comment in its own thread (never as unlinked PR comments):

```bash
# Fixed
gh api repos/{OWNER}/{REPO}/pulls/{PR_NUMBER}/comments/{COMMENT_ID}/replies \
  -f body="Fixed — {brief description of what was done}"

# Not applicable
gh api repos/{OWNER}/{REPO}/pulls/{PR_NUMBER}/comments/{COMMENT_ID}/replies \
  -f body="Not applicable — {specific reason why this doesn't apply}"

# Deferred
gh api repos/{OWNER}/{REPO}/pulls/{PR_NUMBER}/comments/{COMMENT_ID}/replies \
  -f body="Deferred — tracked as GitHub Issue for future work"
```

### Step 8: Smart Threshold Check

After addressing all comments, check whether to request another round:

```bash
ROUND_COMMENTS={number of top-level comments this round}

if [ "$ROUND_COMMENTS" -eq 0 ]; then
  echo "CLEAN ROUND — eligible for merge"
elif [ "$ROUND_COMMENTS" -le "$THRESHOLD" ]; then
  echo "Under threshold ($ROUND_COMMENTS <= $THRESHOLD) — address and proceed"
else
  echo "Over threshold ($ROUND_COMMENTS > $THRESHOLD) — push fixes and wait for Copilot re-review"
fi
```

### Step 9: Repeat (Minimum 2 Rounds)

The pipeline requires a **minimum of 2 rounds** before merge is eligible:

| Round | Purpose |
|-------|---------|
| 1 | Initial Copilot review |
| 2+ | Review fixes, verify clean |

**Merge eligibility:**
- Minimum 2 rounds completed
- Last round is either clean (0 new comments) OR under threshold
- All CI checks passing
- All inline comments replied to

If still getting significant comments after round 3, report to user with summary.

### Step 10: Merge

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
- Round 1: {X} Copilot comments
- Round 2: Clean pass → merged
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
gh api repos/{OWNER}/{REPO}/pulls/{PR}/comments

# Reply to a specific comment (in its thread)
gh api repos/{OWNER}/{REPO}/pulls/{PR}/comments/{ID}/replies -f body="..."

# List PR reviews (approve/request changes)
gh api repos/{OWNER}/{REPO}/pulls/{PR}/reviews

# Check PR status
gh pr view {PR} --json mergeable,mergeStateStatus,statusCheckRollup

# Get PR size stats
gh pr view {PR} --json additions,deletions,changedFiles
```
