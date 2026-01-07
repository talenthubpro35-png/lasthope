# Simple script to create database
# Run: powershell -ExecutionPolicy Bypass -File create-db.ps1

$env:Path += ";C:\Program Files\PostgreSQL\16\bin"

Write-Host "Creating database 'talenthub'..." -ForegroundColor Cyan
Write-Host "You will be prompted for the PostgreSQL password." -ForegroundColor Yellow
Write-Host ""

# Check if database exists
$checkDb = & psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='talenthub'" 2>&1

if ($checkDb -match "1") {
    Write-Host "Database 'talenthub' already exists!" -ForegroundColor Green
} else {
    # Create database
    & psql -U postgres -c "CREATE DATABASE talenthub;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Database created successfully!" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to create database. Check your password." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Next step: Create .env file with your DATABASE_URL" -ForegroundColor Cyan



