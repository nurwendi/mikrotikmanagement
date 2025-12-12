Write-Host "Starting NetFlowPro Server..."
$nodePath = "C:\Program Files\nodejs\node.exe"
$nextPath = ".\node_modules\next\dist\bin\next"

if (!(Test-Path $nodePath)) {
    Write-Error "Node.exe not found at $nodePath"
    Read-Host "Press Enter to exit..."
    exit 1
}

if (!(Test-Path $nextPath)) {
    Write-Error "Next.js binary not found at $nextPath"
    Read-Host "Press Enter to exit..."
    exit 1
}

Write-Host "Using Node: $nodePath"
Write-Host "Using Next: $nextPath"
Write-Host "Running command..."

& $nodePath $nextPath dev

if ($LASTEXITCODE -ne 0) {
    Write-Error "Server exited with code $LASTEXITCODE"
}

Read-Host "Press Enter to exit..."
