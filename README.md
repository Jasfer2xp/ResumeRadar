# ResumeRadar

> **Your resume. Our radar. Your next job.**

Upload your resume and let AI search the web for relevant job opportunities.

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL (or use Docker)

### Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your NVIDIA_API_KEY and SEARCH_API_KEY (optional for dev)

# Generate Prisma client and push schema
npm run db:generate
npm run db:push

# Start development servers (API + Web)
npm run dev
```

- **Frontend:** http://localhost:5173
- **API:** http://localhost:3000

### Development Mode (No API Keys)

Without `NVIDIA_API_KEY` and `SEARCH_API_KEY`, the app runs with mock providers so you can test the full flow locally.

## Architecture

```
Upload Resume → Extract Text → Inkling (Resume AI)
    → Candidate Profile → Search Queries → Web Search
    → Job Normalization → GPT-OSS-20B (Matching)
    → Deterministic Scoring → Ranked Results
```

## Tech Stack

- **Frontend:** React, Vite, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL, Prisma ORM
- **AI:** NVIDIA NIM (Inkling + GPT-OSS-20B)
- **Search:** Tavily API (configurable)

## Environment Variables

See `.env.example` for all configuration options.

## Project Structure

```
resumeradar/
├── apps/
│   ├── web/          # React frontend
│   └── api/          # Express backend
├── packages/
│   └── shared/       # Shared types & scoring logic
└── prisma/           # Database schema
```

## License

Private — All rights reserved.
