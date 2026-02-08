# Stop running instances
Stop-Process -Name "AscensionStairs" -ErrorAction SilentlyContinue
Stop-Process -Name "electron" -ErrorAction SilentlyContinue

Write-Host "Building React App..."
npm run build
if ($LASTEXITCODE -ne 0) { exit 1 }

$releaseDir = "AscensionStairs-Software"
$resourcesDir = "$releaseDir/resources"
$appDir = "$resourcesDir/app"

# Clean previous release
if (Test-Path $releaseDir) {
    Remove-Item -Path $releaseDir -Recurse -Force -ErrorAction SilentlyContinue
    if (Test-Path $releaseDir) {
        Write-Warning "Could not remove existing directory completely. Trying to overwrite..."
    }
}
# Copy Electron Binaries
Write-Host "Copying Electron binaries..."
$electronPath = "node_modules/electron/dist"
New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null
Copy-Item -Path "$electronPath/*" -Destination $releaseDir -Recurse -Force

# Create App Directory
New-Item -ItemType Directory -Path $appDir -Force | Out-Null

# Rename Executable
Rename-Item -Path "$releaseDir/electron.exe" -NewName "AscensionStairs.exe"

# Copy App Resources
Write-Host "Copying App Resources..."
# Copy package.json
Copy-Item -Path "package.json" -Destination $appDir

# Copy electron main process
New-Item -ItemType Directory -Path "$appDir/electron" -Force | Out-Null
Copy-Item -Path "electron/main.cjs" -Destination "$appDir/electron/"

# Copy dist (renderer)
Copy-Item -Path "dist" -Destination $appDir -Recurse

# Cleanup default app if exists
if (Test-Path "$resourcesDir/default_app.asar") {
    Remove-Item "$resourcesDir/default_app.asar" -Force
}

Write-Host "Packaging Complete!"
Write-Host "Output: $PWD\$releaseDir\AscensionStairs.exe"
