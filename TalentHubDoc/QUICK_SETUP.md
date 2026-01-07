# Quick PostgreSQL Setup

PostgreSQL is installed! Follow these steps:

## Step 1: Create the Database

Open PowerShell and run:

```powershell
# Add PostgreSQL to PATH for this session
$env:Path += ";C:\Program Files\PostgreSQL\16\bin"

# Create database (will ask for password)
psql -U postgres -c "CREATE DATABASE talenthub;"
```

**Note**: Enter the password you set during PostgreSQL installation when prompted.

If database already exists, that's fine - you can continue.

## Step 2: Create .env File

Create a file named `.env` in the project root with this content:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/talenthub
PORT=5000
NODE_ENV=development
SESSION_SECRET=dev-secret-key-change-in-production
```

**Replace `YOUR_PASSWORD` with your actual PostgreSQL password!**

## Step 3: Push Schema

```powershell
npm run db:push
```

## Step 4: Start Server

```powershell
npm start
```

You should see: `[db] Database connection initialized` ✅

---

**Having trouble?** The password is the one you set when installing PostgreSQL.



