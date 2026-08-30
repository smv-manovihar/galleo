---
name: release-version
description: >
  Standardized release workflow for bumping versions, updating RELEASE_NOTES.md from git diffs,
  generating caveman-commit messages, requesting confirmation, committing to main, creating and
  pushing an ephemeral release/v<version> branch to trigger CI/CD builds, cleaning up locally,
  and pushing to main with remote branch pruning. Triggers: "release version", "cut a release",
  "publish release", "bump version and release", "prepare release", "/release".
depends_on: caveman-commit
---

# Release Version Skill

Automated and safe release workflow for Galleo. Generates accurate release notes from Git diffs, enforces quality verification, creates conventional commit messages, and triggers CI/CD builds via ephemeral release branches.

> [!IMPORTANT]
> **Cross-Platform Shell Syntax (Windows PowerShell):**
> * **Never use `&&` to chain commands in Windows PowerShell** — `&&` causes a PowerShell parser syntax error (`The token '&&' is not a valid statement separator`).
> * Execute commands sequentially as individual steps, or use `;` as the statement separator in PowerShell (e.g. `git add . ; git commit -m "..."`).

---

## Release Pipeline Overview

```text
1. [Inspect & Version]    → Query latest Git tag, inspect diffs, determine SemVer bump
2. [Generate Notes]       → Write RELEASE_NOTES.md ("What's New", "Improvements", "Bug Fixes")
3. [Update Version]       → Bump version in package.json
4. [Draft Commit Message] → Generate terse Conventional Commit via caveman-commit
5. [Verify Codebase]      → Run pnpm run typecheck, then pnpm test
6. [User Confirmation]   → Present release details and obtain explicit user approval
7. [Commit to main]       → Stage changes and commit on main
8. [Trigger CI Release]   → Create and push release/v<version> branch to origin
9. [Local Cleanup & Sync] → Checkout main, delete local release branch, push main
10. [Prune Remote]        → Run git fetch --prune to clean up deleted remote release branch
```

---

## Detailed Step-by-Step Instructions

### Step 1: Inspect Changes & Determine Target Version

1. Identify the previous release tag:
   ```bash
   git describe --tags --abbrev=0
   ```
   *(Fallback if no tags output: `git tag --sort=-v:refname`)*

2. Inspect all commits and file diffs since the last release tag:
   ```bash
   git log <last_tag>..HEAD --oneline
   git diff <last_tag>..HEAD --stat
   ```

3. Determine the target version:
   * If the user specified a version (e.g., `1.3.0`), use that exact version.
   * Otherwise, determine the appropriate SemVer bump from the diff:
     * **Patch (`x.y.Z+1`)**: Bug fixes, minor visual adjustments, performance tweaks, non-breaking refactors.
     * **Minor (`x.Y+1.0`)**: New user-facing features, new audit modes, new settings.
     * **Major (`X+1.0.0`)**: Breaking architectural changes or backward-incompatible library/database rewrites.

---

### Step 2: Update `RELEASE_NOTES.md`

Generate `RELEASE_NOTES.md` in the repository root by categorizing the changes since `<last_tag>` into the standard template.

#### Template Structure:
```markdown
# Galleo v<version>

## What's New

* **Feature Name:** Concise description of major new features or capabilities added.

## Improvements

* **Area / Component:** Meaningful enhancement, UI/UX polish, performance upgrade, or refactor.

## Bug Fixes

* **Fix Title:** Clear description of the bug, the root cause, and what was resolved.

---

**Full Changelog**: [v<prev_version>...v<version>](https://github.com/smv-manovihar/galleo/compare/v<prev_version>...v<version>)
```

#### Rules for Release Notes:
* Omit any section that has no relevant changes (e.g., if there are no new features, omit `## What's New`).
* Use bold titles for bullet points (`* **Title:** Explanation`).
* Focus on user impact and clear technical explanations.
* Ensure the compare link at the bottom uses the exact previous tag and target version.

---

### Step 3: Bump Version in `package.json`

Update `"version"` field in `package.json` to the target version `<version>` (without `v` prefix).

---

### Step 4: Generate Commit Message using `caveman-commit`

Draft a terse Conventional Commit message following the `caveman-commit` format:
* Format: `<type>(<scope>): <terse summary> & v<version> bump`
* Examples:
  * `feat(media): unified visual similarity radius & v1.2.3 bump`
  * `fix(duplicates): resolution-prioritized best item election & v1.2.2 bump`
  * `perf(scanner): fast single-pass video hashing & v1.2.0 bump`

---

### Step 5: Verification Gate

Before asking for confirmation or committing, verify that the application compiles and passes tests:
```bash
pnpm run typecheck
pnpm test
```
If errors are found, fix them before proceeding.

---

### Step 6: User Confirmation Gate

Present the release proposal to the user with a clear summary:
1. **Target Version:** `v<version>` (from `v<prev_version>`)
2. **Commit Message:** `<commit_message>`
3. **Release Notes Preview:** (Render or highlight `RELEASE_NOTES.md` content)
4. **Modified Files:** List of files staged for release

> **STOP:** Wait for explicit user confirmation before executing git commands.

---

### Step 7: Commit Changes to `main`

Once confirmed:
1. Stage all release files:
   ```bash
   git add package.json RELEASE_NOTES.md
   # Include any additional modified source files from the current session
   git add .
   ```
2. Commit on `main`:
   ```bash
   git commit -m "<commit_message>"
   ```

---

### Step 8: Trigger CI Release via Ephemeral Branch

GitHub Actions (`.github/workflows/release.yml`) triggers on pushes to `release/**`.
1. Create and switch to the release branch:
   ```bash
   git checkout -b release/v<version>
   ```
2. Push the release branch to `origin`:
   ```bash
   git push origin release/v<version>
   ```
   *(This starts the multi-platform installer build and release draft creation on GitHub Actions).*

---

### Step 9: Local Cleanup & Sync Main

1. Return to the `main` branch:
   ```bash
   git checkout main
   ```
2. Delete the release branch locally:
   ```bash
   git branch -D release/v<version>
   ```
3. Push `main` to `origin`:
   ```bash
   git push origin main
   ```

---

### Step 10: Prune Remote Tracking Branches

The GitHub Actions release workflow automatically deletes the remote `release/v<version>` branch once publication completes. Prune stale tracking references locally:
```bash
git fetch --prune
```

---

## Checklist Summary

- [ ] Target version identified and diff reviewed against previous tag
- [ ] `RELEASE_NOTES.md` generated with "What's New", "Improvements", "Bug Fixes"
- [ ] `package.json` version bumped
- [ ] Conventional Commit message drafted
- [ ] Codebase verified via `pnpm run typecheck` and `pnpm test`
- [ ] Explicit user confirmation received
- [ ] Committed directly to `main`
- [ ] Pushed to `release/v<version>` to trigger GitHub release build
- [ ] Switched back to `main` and deleted `release/v<version>` locally
- [ ] Pushed `main` to `origin`
- [ ] Pruned tracking branches with `git fetch --prune`
