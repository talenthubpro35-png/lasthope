# Database Setup Guide

This guide will help you set up a PostgreSQL database for TalentHub Pro.

## Quick Start

The application automatically uses PostgreSQL when `DATABASE_URL` is set, or falls back to in-memory storage if not configured.

## Option 1: Neon (Cloud Database - Recommended)

Neon is a serverless PostgreSQL platform perfect for development and production.

### Steps:

1. **Create a Neon Account**
   - Visit: https://console.neon.tech/
   - Sign up (free tier available)

2. **Create a Project**
   - Click "Create Project"
   - Choose a name and region
   - Click "Create"

3. **Get Connection String**
   - In your project dashboard, find "Connection Details"
   - Copy the connection string (it looks like):
     ```
     postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```

4. **Configure Environment**
   - Create a `.env` file in the project root (if it doesn't exist)
   - Add your connection string:
     ```env
     DATABASE_URL=postgresql://username:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```

5. **Push Schema**
   ```bash
   npm run db:push
   ```

6. **Restart Server**
   ```bash
   npm start
   ```

You should see: `[db] Database connection initialized` in the console.

## Option 2: Local PostgreSQL

### Steps:

1. **Install PostgreSQL**
   - Windows: Download from https://www.postgresql.org/download/windows/
   - macOS: `brew install postgresql@14`
   - Linux: `sudo apt-get install postgresql`

2. **Start PostgreSQL Service**
   - Windows: Services app → Start PostgreSQL service
   - macOS/Linux: `pg_ctl -D /usr/local/var/postgres start`

3. **Create Database**
   ```bash
   psql -U postgres
   ```
   Then in psql:
   ```sql
   CREATE DATABASE talenthub;
   \q
   ```

4. **Configure Environment**
   - Create `.env` file:
     ```env
     DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/talenthub
     ```
   - Replace `yourpassword` with your PostgreSQL password

5. **Push Schema**
   ```bash
   npm run db:push
   ```

6. **Restart Server**

## Option 3: Docker PostgreSQL

### Steps:

1. **Run PostgreSQL Container**
   ```bash
   docker run --name talenthub-db \
     -e POSTGRES_PASSWORD=mysecretpassword \
     -e POSTGRES_DB=talenthub \
     -p 5432:5432 \
     -d postgres:16
   ```

2. **Configure Environment**
   ```env
   DATABASE_URL=postgresql://postgres:mysecretpassword@localhost:5432/talenthub
   ```

3. **Push Schema**
   ```bash
   npm run db:push
   ```

4. **Restart Server**

## Verification

After setup, check the console output when starting the server:

✅ **Success**: `[db] Database connection initialized`  
✅ **Success**: `[storage] Using PostgreSQL database`

❌ **Fallback**: `[db] DATABASE_URL not set, using in-memory storage`  
❌ **Error**: Check your connection string and database accessibility

## Troubleshooting

### Connection Refused
- Check if PostgreSQL is running
- Verify the port (default: 5432)
- Check firewall settings

### Authentication Failed
- Verify username and password
- Check PostgreSQL authentication settings (pg_hba.conf)

### SSL Required (Neon)
- Make sure your connection string includes `?sslmode=require`
- Neon requires SSL connections

### Schema Push Fails
- Ensure database exists
- Check user has CREATE TABLE permissions
- Verify DATABASE_URL format is correct

## Current Schema

The database currently includes:
- **users** table: id, username, password

To view all tables after setup:
```sql
\dt  -- In psql
```

## Migration Files

Schema migrations are stored in the `migrations/` directory (created after first `npm run db:push`).

## Production Notes

- Use strong passwords
- Enable SSL/TLS
- Set up connection pooling
- Configure backups
- Monitor database performance



