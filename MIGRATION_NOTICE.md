# Migration Notice: Recruiting Repo Separated (2026-03-24)

The `recruiting` tool has been moved out of the earmarked repository into its own standalone repo.

## What changed
- The `recruiting` submodule reference was removed from earmarked
- The recruiting code now lives in its own repository

## Where recruiting lives now
- **Local path:** `/Users/vaidehi/projects/recruiting/`
- **GitHub:** `https://github.com/theorem-labs/recruiting.git`

## If you're an AI agent working in an earmarked worktree

1. **Sync your worktree** to pick up this change:
   ```bash
   git fetch origin && git rebase origin/main
   ```

2. If you see merge conflicts related to `recruiting`, just accept the deletion:
   ```bash
   git rm recruiting
   git rebase --continue
   ```

3. If you need to work on recruiting, switch to the standalone repo:
   ```bash
   cd /Users/vaidehi/projects/recruiting/
   ```

4. **Do not** try to re-add recruiting as a submodule in earmarked.

## This file can be deleted
Once all agents have synced, this file is no longer needed and can be removed.
