# ============================================================
# TISSAGE — Sync commits to all branches (develop → test → staging → main)
# Usage: .\scripts\sync-branches.ps1 [-CommitSha "abc1234"]
# ============================================================

param(
  [string]$CommitSha = "",
  [switch]$SkipPush
)

$ErrorActionPreference = "Stop"
$branches = @("develop", "test", "staging", "main")
$currentBranch = git rev-parse --abbrev-ref HEAD

Write-Host "=== TISSAGE Branch Sync ===" -ForegroundColor Cyan

# Get the commit to cherry-pick
if (-not $CommitSha) {
  if ($currentBranch -ne "main") {
    Write-Host "✗ Actuellement sur '$currentBranch'. Basculer sur main ou spécifier -CommitSha" -ForegroundColor Red
    exit 1
  }
  $CommitSha = git rev-parse HEAD
}

$commitMsg = git log --oneline -1 $CommitSha
Write-Host "Commit: $commitMsg" -ForegroundColor Yellow
Write-Host ""

# Stash any local changes
if (git status --porcelain) {
  Write-Host "→ Stashing local changes..." -ForegroundColor Gray
  git stash push -m "auto-stash before sync"
  $stashed = $true
} else {
  $stashed = $false
}

try {
  foreach ($branch in $branches) {
    if ($branch -eq $currentBranch -or ($branch -eq "main" -and $currentBranch -ne "main")) {
      Write-Host "⏭ Skip $branch (current)" -ForegroundColor DarkGray
      continue
    }

    Write-Host "→ Cherry-pick to $branch ..." -ForegroundColor Green
    git checkout $branch
    git pull origin $branch --ff-only

    # Check if commit already exists on this branch
    $alreadyThere = git log --oneline -10 $branch | Select-String $CommitSha.Substring(0, 8)
    if ($alreadyThere) {
      Write-Host "  ⚠ Commit déjà présent sur $branch, skip" -ForegroundColor Yellow
      continue
    }

    git cherry-pick $CommitSha
    if ($LASTEXITCODE -ne 0) {
      Write-Host "  ✗ Conflit sur $branch! Résoudre manuellement puis relancer" -ForegroundColor Red
      exit 1
    }

    if (-not $SkipPush) {
      git push origin $branch
      Write-Host "  ✓ Pushed $branch" -ForegroundColor Green
    } else {
      Write-Host "  ✓ Ready (skip push)" -ForegroundColor Green
    }
  }
}
finally {
  # Return to original branch
  git checkout $currentBranch 2>$null
  if ($stashed) {
    Write-Host "→ Restoring stash..." -ForegroundColor Gray
    git stash pop 2>$null
  }
}

Write-Host ""
Write-Host "=== Sync terminé ===" -ForegroundColor Cyan
Write-Host "Branches: main ← staging ← test ← develop" -ForegroundColor Cyan
