# Deploy Script for Raspberry Pi Dashboard
# Uses Git + Tailscale for seamless deployment from anywhere

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "  Deploying to Raspberry Pi" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build React app
Write-Host "[1/4] Building React app..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed! Check for errors above." -ForegroundColor Red
    exit 1
}

Write-Host "Build successful!" -ForegroundColor Green
Write-Host ""

# Step 2: Commit and push to Git (optional - comment out if not using Git)
Write-Host "[2/4] Pushing to Git repository..." -ForegroundColor Yellow
cd ..
git add .
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
git commit -m "Deploy: $timestamp" 2>$null
git push origin main 2>$null
cd dashboard
Write-Host "Git push complete (if configured)" -ForegroundColor Green
Write-Host ""

# Step 3: Deploy to Pi via Tailscale
Write-Host "[3/4] Deploying to Pi (100.82.69.79 via Tailscale)..." -ForegroundColor Yellow

# Option A: Using Git (recommended)
# ssh tian@100.82.69.79 "cd ~/pi-dashboard && git pull && cd dashboard && npm run build && sudo cp -r dist/* /var/www/html/ && sudo chmod -R 755 /var/www/html"

# Option B: Using SCP (works without Git)
scp -r dist/* tian@100.82.69.79:/var/www/html/

if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment failed! Check Tailscale connection." -ForegroundColor Red
    exit 1
}

# Fix permissions
ssh tian@100.82.69.79 "chmod -R 755 /var/www/html"

Write-Host "Files deployed and permissions fixed!" -ForegroundColor Green
Write-Host ""

# Step 4: Restart backend if needed
Write-Host "[4/4] Restarting services..." -ForegroundColor Yellow
ssh tian@100.82.69.79 "cd ~/server && pm2 restart server" 2>$null
Write-Host "Services restarted (if configured)" -ForegroundColor Green
Write-Host ""

# Done
Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Access your dashboard at:" -ForegroundColor Cyan
Write-Host "  http://100.82.69.79 (Tailscale - works anywhere!)" -ForegroundColor White
Write-Host ""
