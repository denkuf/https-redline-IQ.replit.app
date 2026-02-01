# Redline IQ - Contract Analysis Application

## Overview
Redline IQ is a contract analysis web application that acts as a "digital lawyer in your pocket." It helps ordinary people understand contracts before signing by providing AI-powered plain-English summaries, risk detection with exact clause references, key terms extraction, negotiation guidance, and export functionality.

## Project Status
**Current State**: V2 Complete - Full negotiation advocacy tool with industry-specific analysis

### V2 Features
- **Industry-Specific Analysis Modes**: 7 modes (General, Rent/Lease, Employment, Freelance, Insurance, SaaS/Subscription, Small Business) with tailored playbooks
- **"Should I Sign This?" Verdict Engine**: 0-100 risk score with clear verdict labels (Safe, Caution, High Risk, Do Not Sign)
- **Negotiation Suggestions**: For each risky clause - what it does, why it's risky, suggested replacement language, and negotiation scripts
- **Personal Risk Preferences**: Customize analysis based on risk tolerance and priorities
- **Enhanced Exports**: Negotiation Pack PDF with clause-by-clause guidance

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
│   ├── VerdictPanel.tsx       # "Should I Sign This?" verdict display
│   ├── IndustryModeSelector.tsx # Contract type dropdown
│   ├── NegotiationSuggestion.tsx # Per-risk negotiation guidance
│   ├── RiskPreferencesForm.tsx   # User risk preference settings
│   ├── RiskFlags.tsx             # Risk flags with negotiation badges
│   └── FileUpload.tsx            # Enhanced with industry mode + preferences
├── pages/          # Route pages (Home, History, Settings, ContractAnalysis)
├── hooks/          # Custom React hooks
└── lib/            # Utilities and query client

server/
├── routes.ts       # API endpoints (with V2 routes)
├── ai.ts           # OpenAI integration with industry playbooks
├── fileParser.ts   # PDF/DOCX/image parsing
├── export.ts       # PDF, text, and negotiation pack export
├── storage.ts      # Database operations
└── seed.ts         # Sample data seeding

shared/
└── schema.ts       # Database schema with V2 types (Verdict, NegotiationSuggestion, RiskPreferences)
```

## Key Features

### 1. Contract Upload
- Supports PDF, DOCX, DOC, and image files
- Text paste option for quick analysis
- **Industry mode selection** (rent/lease, employment, freelance, etc.)
- **Optional risk preferences** for personalized analysis

### 2. Verdict Engine ("Should I Sign This?")
- **Risk Score**: 0-100 scale (0 = very safe, 100 = do not sign)
- **Verdict Labels**: Safe (0-25), Caution (26-50), High Risk (51-75), Do Not Sign (76-100)
- **Top 3 Risks**: Most critical concerns highlighted
- **Negotiation Priorities**: What to negotiate first

### 3. AI Analysis with Industry Playbooks
- Plain-English summaries
- Risk flags with **exact clause quotes** (grounded analysis)
- **Industry-specific red flags** (e.g., security deposits for leases, non-competes for employment)
- **"Commonly seen" vs "Unusual"** clause tagging
- Key terms extraction by category
- Confidence scores on assessments
- Clarifying questions for ambiguous contracts

### 4. Negotiation Guidance
- **What it does**: Plain explanation of the clause
- **Why it's risky**: Why this hurts the signer
- **Suggested change**: Plain and formal replacement language
- **Negotiation script**: "What to say" guidance

### 5. Risk Detection Rules
- Every risk flag MUST include exact contract text quote
- Confidence scores (0-1) for each assessment
- Risks below 0.7 confidence are flagged for professional review
- NO law invention - informational analysis only

### 6. Export
- PDF export with formatted report
- Text export for email sharing
- **Negotiation Pack PDF**: Clause-by-clause negotiation guide

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/contracts | List all contracts |
| GET | /api/contracts/:id | Get single contract |
| POST | /api/contracts | Create from text (accepts industryMode, riskPreferences) |
| POST | /api/contracts/upload | Upload file (accepts industryMode, riskPreferences) |
| POST | /api/contracts/:id/explain | Explain selected text |
| POST | /api/contracts/:id/answers | Submit clarifying question answers |
| POST | /api/contracts/:id/reanalyze | Re-analyze with different industry mode |
| POST | /api/contracts/:id/compare | Compare with new version (version comparison) |
| GET | /api/contracts/:id/export/pdf | Export as PDF |
| GET | /api/contracts/:id/export/text | Export as text |
| GET | /api/contracts/:id/export/negotiation-pack | Export negotiation pack PDF |
| DELETE | /api/contracts/:id | Delete contract |
| DELETE | /api/contracts/purge-all | Delete all contracts |

## Database Schema

### contracts table
- `id`: Serial primary key
- `name`: Contract name/title
- `type`: Contract type (lease, employment, freelance, etc.)
- `industryMode`: Analysis mode (general, rent_lease, employment, freelance, insurance, saas_subscription, small_business)
- `originalFileName`: Original upload filename
- `extractedText`: Parsed contract text
- `status`: pending | analyzing | completed | error
- `analysis`: JSONB with full analysis result (includes verdict, negotiation suggestions)
- `parentContractId`: For version comparison
- `version`: Contract version number
- `createdAt`: Timestamp

### Analysis Result Schema (JSONB)
- `summary`: Plain-English summary with parties, obligations, dates
- `keyTerms`: Array of categorized terms
- `riskFlags`: Array with severity, clauseQuote, negotiation suggestions
- `verdict`: Risk score (0-100), verdict label, top risks, negotiation priorities
- `clarifyingQuestions`: Questions for ambiguous contracts
- `overallAssessment`: Final assessment text
- `industryMode`: Mode used for analysis

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
- All risk flags must be grounded with exact clause quotes (minimum 10 characters)
- Confidence scores are validated (0.0 - 1.0)
- Risk flags without proper quotes are filtered out server-side
- This is informational, NOT legal advice (disclaimer required)
- Risk score guidelines: 0-25 Safe, 26-50 Caution, 51-75 High Risk, 76-100 Do Not Sign
- Industry playbooks provide mode-specific red flags and "commonly seen vs unusual" guidance
