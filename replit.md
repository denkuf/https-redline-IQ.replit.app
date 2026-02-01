# Redline IQ - Contract Analysis Application

## Overview
Redline IQ is a contract analysis web application that acts as a "digital lawyer in your pocket." It helps ordinary people understand contracts before signing by providing AI-powered plain-English summaries, risk detection with exact clause references, key terms extraction, and export functionality.

## Project Status
**Current State**: Fully functional MVP with sample data seeded

## Architecture

### Frontend (React + TypeScript)
- **Framework**: Vite + React with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query v5
- **UI Components**: Shadcn/UI with Radix primitives
- **Styling**: Tailwind CSS with custom design tokens

### Backend (Express + TypeScript)
- **Framework**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: OpenAI GPT-5.2 via Replit AI Integrations
- **File Parsing**: pdf-parse, mammoth (DOCX), OpenAI Vision (images)

### Key Directories
```
client/src/
├── components/     # Reusable UI components
├── pages/          # Route pages (Home, History, Settings, ContractAnalysis)
├── hooks/          # Custom React hooks
└── lib/            # Utilities and query client

server/
├── routes.ts       # API endpoints
├── ai.ts           # OpenAI integration for contract analysis
├── fileParser.ts   # PDF/DOCX/image parsing
├── export.ts       # PDF and text export generation
├── storage.ts      # Database operations
└── seed.ts         # Sample data seeding

shared/
└── schema.ts       # Database schema and TypeScript types
```

## Key Features

### 1. Contract Upload
- Supports PDF, DOCX, DOC, and image files
- Text paste option for quick analysis
- Automatic text extraction

### 2. AI Analysis
- Plain-English summaries
- Risk flags with **exact clause quotes** (grounded analysis)
- Key terms extraction by category
- Confidence scores on assessments
- Clarifying questions for ambiguous contracts

### 3. Risk Detection Rules
- Every risk flag MUST include exact contract text quote
- Confidence scores (0-1) for each assessment
- Risks below 0.7 confidence are flagged for professional review
- NO law invention - informational analysis only

### 4. Export
- PDF export with formatted report
- Text export for email sharing

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/contracts | List all contracts |
| GET | /api/contracts/:id | Get single contract |
| POST | /api/contracts | Create from text |
| POST | /api/contracts/upload | Upload file |
| POST | /api/contracts/:id/explain | Explain selected text |
| POST | /api/contracts/:id/answers | Submit clarifying question answers |
| GET | /api/contracts/:id/export/pdf | Export as PDF |
| GET | /api/contracts/:id/export/text | Export as text |
| DELETE | /api/contracts/:id | Delete contract |
| DELETE | /api/contracts/purge-all | Delete all contracts |

## Database Schema

### contracts table
- `id`: Serial primary key
- `name`: Contract name/title
- `type`: Contract type (lease, employment, freelance, etc.)
- `originalFileName`: Original upload filename
- `extractedText`: Parsed contract text
- `status`: pending | analyzing | completed | error
- `analysis`: JSONB with full analysis result
- `createdAt`: Timestamp

## Design Tokens (index.css)
- **Primary**: Blue (#199 89% 48%) - Professional legal/trustworthy theme
- **Dark mode**: Fully supported with theme toggle
- **Typography**: Clean, readable fonts

## Sample Data
Database is seeded with 2 analyzed contracts:
1. Standard Apartment Lease Agreement (12-month NYC lease)
2. Freelance Web Development Contract ($15,000 project)

Both include full analysis with summaries, risk flags, key terms, and assessments.

## Running the Application
```bash
npm run dev        # Start development server
npm run db:push    # Push schema to database
```

## Important Guidelines
- Emojis are NOT used anywhere in the UI (lucide-react icons only)
- All risk flags must be grounded with exact clause quotes
- Confidence scores are validated (0.0 - 1.0)
- Risk flags without proper quotes are filtered out
- This is informational, NOT legal advice (disclaimer required)
