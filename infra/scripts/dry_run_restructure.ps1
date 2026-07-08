param(
    [switch]$Execute
)

# Determine repository root (parent of the 'scripts' folder)
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Definition)
Write-Host "Repository root detected: $RepoRoot"
Write-Host "Dry-run restructure script"
Write-Host "Execute mode: $Execute"

$mappings = @(
    @{src = "$RepoRoot\frontend-next"; dest = "$RepoRoot\frontend\nextjs"},
    @{src = "$RepoRoot\src"; dest = "$RepoRoot\frontend\tanstack"},
    @{src = "$RepoRoot\docker"; dest = "$RepoRoot\infra\docker"},
    @{src = "$RepoRoot\scripts"; dest = "$RepoRoot\infra\scripts"},
    @{src = "$RepoRoot\media"; dest = "$RepoRoot\backend\media"},
    @{src = "$RepoRoot\components.json"; dest = "$RepoRoot\frontend\components.json"}
)

foreach ($m in $mappings) {
    $s = $m.src
    $d = $m.dest
    if (-Not (Test-Path $s)) {
        Write-Host "SKIP: source not found -> $s" -ForegroundColor Yellow
        continue
    }
    Write-Host "PLAN: Move `"$s`" -> `"$d`""
    if ($Execute) {
        if (-Not (Test-Path (Split-Path $d -Parent))) {
            New-Item -ItemType Directory -Path (Split-Path $d -Parent) -Force | Out-Null
        }
        Move-Item -Path $s -Destination $d -Force
        Write-Host "DONE: moved $s -> $d" -ForegroundColor Green
    } else {
        Move-Item -Path $s -Destination $d -WhatIf
    }
}

Write-Host "Dry-run complete. Review changes before executing with -Execute."