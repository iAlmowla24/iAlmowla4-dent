# Update-Lectures.ps1
# Regenerates lectures.json from the PDFs in the lectures\ folder,
# then commits and pushes so GitHub Pages updates.
#
# Usage:  right-click > "Run with PowerShell"   (or)   .\Update-Lectures.ps1

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

Write-Host "Scanning lectures\ folder..." -ForegroundColor Cyan
node "scripts/generate-manifest.mjs"

# Push to GitHub if this is a git repo (so the website updates)
if (Test-Path ".git") {
    git add lectures.json lectures
    $changes = git status --porcelain
    if ($changes) {
        git commit -m "Add/update lectures"
        git push
        Write-Host "Pushed. Your page will update in ~1 minute." -ForegroundColor Green
    } else {
        Write-Host "No changes to push." -ForegroundColor Yellow
    }
} else {
    Write-Host "lectures.json rebuilt. (Not a git repo yet — see README to publish.)" -ForegroundColor Yellow
}
