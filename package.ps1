Write-Host "Building Ascension Stairs Installer..."

# Kill any running instances to prevent file locking errors
Write-Host "Stopping running instances..."
Stop-Process -Name "AscensionStairs" -ErrorAction SilentlyContinue
Stop-Process -Name "electron" -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# Run the full build process (TypeScript -> Vite -> Electron Builder)
npm run electron:build

# Check if the build command was successful
if ($LASTEXITCODE -eq 0) {
    Write-Host "Build successful! Opening output directory..."
    Write-Host "--------------------------------------------------------"
    Write-Host "INSTALLER: dist-electron\Ascension Stairs Setup 0.0.0.exe"
    Write-Host "PORTABLE : dist-electron\win-unpacked\Ascension Stairs.exe (Run this to test without installing)"
    Write-Host "--------------------------------------------------------"
    # Open the dist-electron folder in Windows Explorer
    Invoke-Item "dist-electron"
} else {
    Write-Error "Build failed. Please check the error messages above."
    exit 1
}
