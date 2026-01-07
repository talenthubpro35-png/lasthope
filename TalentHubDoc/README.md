# TalentHub Pro - Recruitment Platform

A modern, AI-powered recruitment platform built with React, TypeScript, Express, and Vite.

## Features

- **AI-Powered Matching**: Intelligent job-candidate matching based on skills
- **Automated CV Generation**: AI-powered resume builder
- **Smart Chatbot**: 24/7 AI assistant for recruitment questions
- **Interview Preparation**: AI-generated interview questions
- **Skill Recommendations**: Personalized skill development suggestions
- **Multi-Role Dashboards**: Candidate, Recruiter, and Admin interfaces

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, TypeScript
- **Build Tool**: Vite
- **AI**: OpenAI GPT-4 (optional)
- **Database**: Drizzle ORM (PostgreSQL/Neon ready)

## Getting Started

### Prerequisites

- Node.js 20+ 
- npm or yarn
- (Optional) OpenAI API key for AI features
- (Optional) PostgreSQL/Neon database

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Copy environment variables (optional):
```bash
# Create .env file with your configuration
# See .env.example for reference
```

### Running the Project

#### Production Mode (Recommended for Windows)
```bash
# Build the project first
npm run build

# Start the production server
npm start
```

The server will be available at `http://localhost:5000`

#### Development Mode

**Note**: Development mode with hot reload currently has issues on Windows due to tsx compatibility. Use production mode or WSL for development.

```bash
npm run dev
```

### Environment Variables

Create a `.env` file in the root directory:

```env
PORT=5000
NODE_ENV=development
SESSION_SECRET=your-secret-key
OPENAI_API_KEY=your-openai-api-key  # Optional
DATABASE_URL=your-database-url      # Optional - uses in-memory storage if not set
```

### Database Setup

The application uses **Drizzle ORM** with PostgreSQL. You can use either:
- **Neon** (recommended for cloud) - Serverless Postgres
- **Local PostgreSQL** - Traditional database

#### Option 1: Neon Database (Recommended)

1. Go to [Neon Console](https://console.neon.tech/)
2. Sign up or log in
3. Create a new project
4. Copy your connection string (looks like: `postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`)
5. Add it to your `.env` file:
   ```env
   DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```
6. Push the schema to your database:
   ```bash
   npm run db:push
   ```

#### Option 2: Local PostgreSQL

1. Install PostgreSQL locally
2. Create a database:
   ```sql
   CREATE DATABASE talenthub;
   ```
3. Add connection string to `.env`:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/talenthub
   ```
4. Push the schema:
   ```bash
   npm run db:push
   ```

#### Without Database (Development Only)

If you don't set `DATABASE_URL`, the application will use in-memory storage. **Note**: Data will be lost when the server restarts. This is fine for development but not recommended for production.

After setting up the database, restart your server to use PostgreSQL storage.

## Project Structure

```
TalentHubDoc/
├── client/          # React frontend application
│   └── src/
│       ├── components/  # Reusable UI components
│       ├── pages/       # Page components
│       └── lib/         # Utilities
├── server/          # Express backend
│   ├── routes.ts    # API routes
│   ├── storage.ts   # Data storage layer
│   └── index.ts     # Server entry point
├── shared/          # Shared types and schemas
└── dist/            # Production build output
```

## Available Scripts

- `npm run dev` - Start development server (may have Windows issues)
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run check` - Type check with TypeScript
- `npm run db:push` - Push database schema changes

## API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout
- `POST /api/chat` - AI chatbot
- `POST /api/match/score` - Calculate match score
- `POST /api/interview/generate` - Generate interview questions
- `POST /api/recommendations/skills` - Get skill recommendations

## Pages

- `/` - Landing page
- `/login` - Login page
- `/register` - Registration page
- `/candidate` - Candidate dashboard
- `/recruiter` - Recruiter dashboard
- `/admin` - Admin dashboard
- `/candidate/jobs` - Job search
- `/candidate/cv` - CV builder
- `/candidate/interview-prep` - Interview preparation

## Development Notes

### Windows Compatibility

The project uses `tsx` for TypeScript execution in development mode, which has known path handling issues on Windows with Node.js 20.3.1. 

**Solutions:**
1. Use production mode (`npm run build && npm start`)
2. Use WSL (Windows Subsystem for Linux)
3. Upgrade Node.js to latest version
4. Wait for tsx update that fixes Windows path handling

### Database Migration

After setting up your database, push the schema:

```bash
npm run db:push
```

This will create all necessary tables in your database. You only need to run this once (or after schema changes).

## License

MIT

