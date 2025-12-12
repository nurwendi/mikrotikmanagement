$nodeDir = "$PSScriptRoot\node_portable\node-v22.12.0-win-x64"
$env:Path = "$nodeDir;$env:Path"
Write-Host "Verifying Node version..."
node -v
Write-Host "Installing dependencies..."
npm install
Write-Host "Starting dev server..."
npm run dev
