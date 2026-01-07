# Local PostgreSQL Setup Guide for Windows

## Step 1: Install PostgreSQL

### Option A: Installer (Recommended)

1. **Download PostgreSQL**
   - Visit: https://www.postgresql.org/download/windows/
   - Click "Download the installer"
   - Download the latest version (16.x or 15.x)

2. **Run Installer**
   - Run the downloaded `.exe` file
   - During installation:
     - **Port**: Keep default (5432)
     - **Superuser password**: Remember this password! You'll need it.
     - **Locale**: Default is fine
   - Complete the installation
   - **Important**: Make sure to check "Add PostgreSQL to PATH" if available

3. **Verify Installation**
   - Open PowerShell as Administrator
   - Run: `psql --version`
   - You should see version information

### Option B: Using Chocolatey (If you have it)

```powershell
choco install postgresql
```

## Step 2: Start PostgreSQL Service

PostgreSQL should start automatically, but if not:

1. Open **Services** (Win + R → `services.msc`)
2. Find **postgresql-x64-16** (or similar)
3. Right-click → **Start** (if not running)
4. Set Startup type to **Automatic**

Or via PowerShell (as Administrator):
```powershell
Start-Service postgresql-x64-16
```

## Step 3: Create Database

Open PowerShell and run:

```powershell
# Connect to PostgreSQL (use the password you set during installation)
psql -U postgres

# Then in psql prompt, run:
CREATE DATABASE talenthub;
\q
```

Or create directly:
```powershell
psql -U postgres -c "CREATE DATABASE talenthub;"
```

## Step 4: Configure Environment

Create a `.env` file in your project root:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/talenthub
PORT=5000
NODE_ENV=development
SESSION_SECRET=dev-secret-key
```

**Replace `YOUR_PASSWORD` with the password you set during PostgreSQL installation!**

## Step 5: Push Schema

```powershell
npm run db:push
```

## Step 6: Restart Server

```powershell
npm start
```

You should see: `[db] Database connection initialized`

## Troubleshooting

### "psql is not recognized"
- Add PostgreSQL to PATH:
  - Find installation directory (usually `C:\Program Files\PostgreSQL\16\bin`)
  - Add to System PATH environment variable
  - Restart PowerShell

### "Authentication failed"
- Check your password is correct
- Try: `psql -U postgres -W` (will prompt for password)

### "Connection refused"
- Check PostgreSQL service is running
- Verify port 5432 is not blocked by firewall

### "Database already exists"
- That's fine! Just proceed with `npm run db:push`



