# PostgreSQL Setup Helper Script for Windows
# This script helps you set up PostgreSQL for TalentHub

Write-Host "=== TalentHub PostgreSQL Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if PostgreSQL is installed
$pgPath = "C:\Program Files\PostgreSQL"
$pgVersions = @("16", "15", "14", "13", "12")

$pgInstalled = $false
$pgBinPath = $null

foreach ($version in $pgVersions) {
    $checkPath = "$pgPath\$version\bin\psql.exe"
    if (Test-Path $checkPath) {
        $pgInstalled = $true
        $pgBinPath = "$pgPath\$version\bin"
        Write-Host "✓ PostgreSQL $version found at: $pgBinPath" -ForegroundColor Green
        break
    }
}

if (-not $pgInstalled) {
    Write-Host "✗ PostgreSQL not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install PostgreSQL first:" -ForegroundColor Yellow
    Write-Host "1. Visit: https://www.postgresql.org/download/windows/" -ForegroundColor White
    Write-Host "2. Download and run the installer" -ForegroundColor White
    Write-Host "3. Remember the password you set during installation" -ForegroundColor White
    Write-Host "4. Run this script again after installation" -ForegroundColor White
    Write-Host ""
    Write-Host "Or use Docker (see DATABASE_SETUP.md)" -ForegroundColor Yellow
    exit 1
}

# Add to PATH for this session
$env:Path += ";$pgBinPath"

Write-Host ""
Write-Host "=== Step 1: Testing Connection ===" -ForegroundColor Cyan
$password = Read-Host "Enter PostgreSQL password (for user 'postgres')" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Create password file for psql
$env:PGPASSWORD = $plainPassword

# Test connection
Write-Host "Testing connection..." -ForegroundColor Yellow
$testResult = & "$pgBinPath\psql.exe" -U postgres -h localhost -c "SELECT version();" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Connection successful!" -ForegroundColor Green
} else {
    Write-Host "✗ Connection failed!" -ForegroundColor Red
    Write-Host $testResult -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible issues:" -ForegroundColor Yellow
    Write-Host "- Wrong password" -ForegroundColor White
    Write-Host "- PostgreSQL service not running" -ForegroundColor White
    Write-Host "- Port 5432 blocked by firewall" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "=== Step 2: Creating Database ===" -ForegroundColor Cyan

# Check if database exists
$dbExists = & "$pgBinPath\psql.exe" -U postgres -h localhost -tAc "SELECT 1 FROM pg_database WHERE datname='talenthub'" 2>&1

if ($dbExists -eq "1") {
    Write-Host "✓ Database 'talenthub' already exists" -ForegroundColor Green
    $createDb = Read-Host "Do you want to recreate it? (y/N)"
    if ($createDb -eq "y" -or $createDb -eq "Y") {
        Write-Host "Dropping existing database..." -ForegroundColor Yellow
        & "$pgBinPath\psql.exe" -U postgres -h localhost -c "DROP DATABASE talenthub;" 2>&1 | Out-Null
        & "$pgBinPath\psql.exe" -U postgres -h localhost -c "CREATE DATABASE talenthub;" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Database recreated" -ForegroundColor Green
        }
    }
} else {
    Write-Host "Creating database 'talenthub'..." -ForegroundColor Yellow
    & "$pgBinPath\psql.exe" -U postgres -h localhost -c "CREATE DATABASE talenthub;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Database created successfully!" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to create database" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "=== Step 3: Creating .env File ===" -ForegroundColor Cyan

# Create .env file
$envContent = @"
# Database Configuration
DATABASE_URL=postgresql://postgres:$plainPassword@localhost:5432/talenthub

# Server Configuration
PORT=5000
NODE_ENV=development
SESSION_SECRET=dev-secret-key-change-in-production

# OpenAI API Key (optional)
# OPENAI_API_KEY=your-key-here
"@

if (Test-Path ".env") {
    $overwrite = Read-Host ".env file exists. Overwrite? (y/N)"
    if ($overwrite -eq "y" -or $overwrite -eq "Y") {
        $envContent | Out-File -FilePath ".env" -Encoding utf8
        Write-Host "✓ .env file updated" -ForegroundColor Green
    } else {
        Write-Host "Keeping existing .env file" -ForegroundColor Yellow
        Write-Host "Add this line if not present:" -ForegroundColor Yellow
        Write-Host "DATABASE_URL=postgresql://postgres:$plainPassword@localhost:5432/talenthub" -ForegroundColor White
    }
} else {
    $envContent | Out-File -FilePath ".env" -Encoding utf8
    Write-Host "✓ .env file created" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Step 4: Pushing Schema ===" -ForegroundColor Cyan
Write-Host "Run this command to push the database schema:" -ForegroundColor Yellow
Write-Host "  npm run db:push" -ForegroundColor White
Write-Host ""

# Clear password from memory
$env:PGPASSWORD = $null
$plainPassword = $null

Write-Host "=== Setup Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: npm run db:push" -ForegroundColor White
Write-Host "2. Run: npm start" -ForegroundColor White
Write-Host "3. Check console for: [db] Database connection initialized" -ForegroundColor White



