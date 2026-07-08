# Restructure Plan (dry-run)

Goal: reorganize repository into a professional layout with clear backend/frontend/infra/docs separation.

Proposed mappings (non-destructive dry-run):

- Move `frontend-next/` -> `frontend/nextjs/` (legacy Next.js app)
- Move `src/` -> `frontend/tanstack/` (TanStack Start client)
- Move `docker/` -> `infra/docker/` (Dockerfiles + compose)
- Move `scripts/` -> `infra/scripts/` (deployment helpers and seeds)
- Move `media/` -> `backend/media/` (Django media assets)
- Move `components.json` -> `frontend/components.json`

Notes & rationale:
- Keep a single `frontend/` umbrella with subfolders for legacy/current implementations.
- Keep `backend/` as the Django app root (already present). If some Django apps remain at repo root, we will map them into `backend/` during an actual migration.
- Do not move `package.json` at root automatically; review it first to determine if it's workspace-level or frontend-specific.
- The dry-run script `scripts/dry_run_restructure.ps1` will show the `Move-Item -WhatIf` output.

How to run the dry-run:

PowerShell (from repo root):

```powershell
# Dry-run (no changes)
.
\scripts\dry_run_restructure.ps1

# To execute the moves (careful, destructive):
.
\scripts\dry_run_restructure.ps1 -Execute
```

Before executing:
- Commit or stash any uncommitted changes.
- Review the script mappings and adjust any paths you want to keep in place.
- Run tests / start services after migration and update CI and Dockerfile paths.
