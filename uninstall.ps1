Write-Host "🗑️  Starting Buroq Billing Uninstallation..." -ForegroundColor Red

# Helper function to remove directory
function Remove-Dir($path) {
    if (Test-Path $path) {
        Write-Host "Removing $path..." -ForegroundColor Yellow
        Remove-Item $path -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# Helper function to remove file
function Remove-File($path) {
    if (Test-Path $path) {
        Write-Host "Removing $path..." -ForegroundColor Yellow
        Remove-Item $path -Force -ErrorAction SilentlyContinue
    }
}

# 1. Remove Dependencies & Build
Remove-Dir "node_modules"
Remove-Dir ".next"

# 2. Remove Database
Remove-File "prisma/dev.db"
Remove-File "prisma/dev.db-journal"

# 3. Remove Lock Files (Optional, but ensures 'complete' reset)
Remove-File "package-lock.json"

# 4. Remove .env (Ask user or force? 'Completely' implies clean slate)
# We will leave .env by default to preserve config, unless user wants a 'factory reset'.
# But the prompt said 'completely'. Let's rename it to .env.bak just in case.
if (Test-Path ".env") {
    Write-Host "Renaming .env to .env.bak..." -ForegroundColor Yellow
    Rename-Item ".env" ".env.bak" -ErrorAction SilentlyContinue
}

Write-Host "`n✅ Uninstallation Complete!" -ForegroundColor Green
Write-Host "The application has been reset. Run .\install.ps1 to reinstall." -ForegroundColor Cyan
