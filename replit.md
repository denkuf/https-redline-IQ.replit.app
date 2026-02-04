# Redline IQ - Contract Analysis Application

## Overview
Redline IQ is a contract analysis web application that acts as a "digital lawyer in your pocket" and a "personal legal nervous system." It helps ordinary people understand contracts before signing by providing AI-powered plain-English summaries, risk detection with exact clause references, key terms extraction, negotiation guidance, contract monitoring, and emergency legal triage.

## Project Status
**Current State**: V3 Complete + Bonus Features + Full Authentication - Living Legal Guardian Layer

### Authentication (Custom - RedlineIQ Branded)
- **Custom Email/Password Auth**: Fully branded authentication pages (Login, Register) with RedlineIQ logo - no third-party provider buttons
- **Secure Password Hashing**: bcryptjs with 12 salt rounds
- **User Data Isolation**: All data tables include userId column - users can ONLY see their own data
- **Protected Routes**: All API endpoints require authentication via isAuthenticated middleware
- **Landing Page**: Logged-out users see a branded landing page with "Get Started Free" and "Sign In" buttons
- **Auth Pages**: /login and /register with RedlineIQ branding only
- **User Profile**: Sidebar displays user name, email with logout functionality
- **Session Management**: Express sessions with PostgreSQL session store (connect-pg-simple)
- **Account Deletion**: Full account deletion with atomic transaction - deletes all user data (contracts, obligations, sessions, quick scans, etc.) before removing account

### Mobile Navigation
- **Bottom Tab Bar**: Mobile-optimized navigation with 5 tabs: Upload, Dashboard, Quick Scan, History, More
- **More Dropdown**: Additional options (Signed Contracts, Negotiation Coach, Emergency Mode, Settings)
- **No Sidebar on Mobile**: Clean mobile experience without sidebar overlay
- **Responsive Layout**: Sidebar on desktop (768px+), bottom tabs on mobile

### Bonus Features (NEW)
- **Explain Like I'm 12**: One-click simplified explanations with real-world examples for any clause
- **Visual Risk Heatmap**: Color-coded contract sections (Safe/Caution/Danger) for instant visual clarity
- **What If? Simulator**: Ask scenario questions ("What if I cancel early?") and get answers based on contract text
- **Contract Expiry Radar**: Dashboard alerts for upcoming renewals and termination windows
- **Is This Normal?**: Pattern awareness - check if a clause is common, unusual, or a red flag for its contract type
- **Share-Safe Summary**: Generate a non-legal, friendly summary to share with partners/family
- **Trust Seal**: After analysis, displays "Reviewed by Contract Advocate AI - Grounded in your document"
- **Updated App Logo**: New RedlineIQ branded logo displayed in sidebar

### V3 Features
- **Red Flag Shield (Quick Scan)**: Instant clause analysis - paste any text from contracts, emails, WhatsApp to detect red flags
- **Legal Guardian Dashboard**: Ultra-modern mobile-first design with circular score indicator, 2x2 quick action grid, and visual urgency badges
- **Signed Contracts Monitoring**: Track signed contracts with deadline and obligation management
- **Negotiation Coach**: Get strategic responses in different tones when negotiating
- **Emergency Mode**: Legal triage - describe a problem and get relevant contracts, clauses, and next steps
- **Contract Obligations**: Track payments, renewals, termination windows with reminders
- **Company Intelligence**: Anonymized counterparty data and risk patterns

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
│   ├── FileUpload.tsx            # Enhanced with industry mode + preferences
│   └── AppSidebar.tsx            # V3 navigation with grouped menu items
├── pages/          # Route pages
│   ├── Home.tsx               # Contract upload page
│   ├── Dashboard.tsx          # V3 Legal Guardian Dashboard
│   ├── QuickScan.tsx          # V3 Red Flag Shield
│   ├── NegotiationCoach.tsx   # V3 Negotiation responses
│   ├── SignedContracts.tsx    # V3 Contract monitoring
│   ├── Emergency.tsx          # V3 Emergency mode
│   ├── History.tsx            # Contract history
│   ├── ContractAnalysis.tsx   # Contract analysis view
│   └── Settings.tsx           # User settings
├── hooks/          # Custom React hooks
└── lib/            # Utilities and query client

server/
├── routes.ts       # API endpoints (V2 + V3 routes)
├── ai.ts           # OpenAI integration with industry playbooks + V3 AI functions
├── fileParser.ts   # PDF/DOCX/image parsing
├── export.ts       # PDF, text, and negotiation pack export
├── storage.ts      # Database operations (V2 + V3 tables)
└── seed.ts         # Sample data seeding

shared/
└── schema.ts       # Database schema with V2 + V3 types
```

## Key Features

### 1. Contract Upload
- Supports PDF, DOCX, DOC, and image files
- **Camera capture**: Take photos of contracts directly from mobile device
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

### V2 Contract Analysis
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

### V3 Legal Guardian Features
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/quick-scan | Red Flag Shield - analyze text for instant red flags |
| GET | /api/signed-contracts | List all signed contracts |
| GET | /api/signed-contracts/:id | Get signed contract with obligations |
| POST | /api/signed-contracts | Mark a contract as signed |
| PATCH | /api/signed-contracts/:id | Update signed contract status |
| GET | /api/obligations/upcoming | Get upcoming obligations (next 30 days) |
| PATCH | /api/obligations/:id | Update obligation status (mark complete) |
| POST | /api/negotiation-coach | Get strategic negotiation responses |
| POST | /api/emergency | Emergency mode - get help for legal issues |
| GET | /api/legal-score | Get user's legal safety score |

## Database Schema

### V2 Tables

#### contracts table
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

#### Analysis Result Schema (JSONB)
- `summary`: Plain-English summary with parties, obligations, dates
- `keyTerms`: Array of categorized terms
- `riskFlags`: Array with severity, clauseQuote, negotiation suggestions
- `verdict`: Risk score (0-100), verdict label, top risks, negotiation priorities
- `clarifyingQuestions`: Questions for ambiguous contracts
- `overallAssessment`: Final assessment text
- `industryMode`: Mode used for analysis

### V3 Tables

#### signedContracts table
- `id`: Serial primary key
- `contractId`: Reference to contracts table
- `signedDate`: When contract was signed
- `counterpartyName`: Other party name
- `status`: active | expired | terminated
- `notes`: Optional notes
- `createdAt`: Timestamp

#### contractObligations table
- `id`: Serial primary key
- `signedContractId`: Reference to signedContracts
- `title`: Obligation name
- `description`: Details
- `type`: payment | renewal | termination_window | other
- `dueDate`: When it's due
- `isRecurring`: Boolean
- `recurringInterval`: monthly | quarterly | yearly
- `status`: pending | completed | missed
- `reminderSent`: Boolean
- `createdAt`: Timestamp

#### quickScans table
- `id`: Serial primary key
- `inputText`: Text that was scanned
- `analysis`: JSONB with red flags found
- `createdAt`: Timestamp

#### negotiationSessions table
- `id`: Serial primary key
- `counterpartyMessage`: What they said
- `response`: JSONB with strategy and replies
- `createdAt`: Timestamp

#### companyIntelligence table
- `id`: Serial primary key
- `companyName`: Normalized company name
- `totalContracts`: Count of contracts
- `averageRiskScore`: Aggregate risk
- `commonClauses`: JSONB with pattern data
- `lastUpdated`: Timestamp

#### userLegalScore table
- `id`: Serial primary key
- `currentScore`: 0-100 legal safety score
- `contractsAnalyzed`: Total contracts analyzed
- `issuesResolved`: Issues fixed
- `obligationsMet`: Obligations completed
- `updatedAt`: Timestamp

#### clausePatterns table
- `id`: Serial primary key
- `clauseType`: Category of clause
- `pattern`: The clause text pattern
- `frequency`: How often seen
- `typicalRiskLevel`: Average risk
- `industryMode`: Which industry
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
- All risk flags must be grounded with exact clause quotes (minimum 10 characters)
- Confidence scores are validated (0.0 - 1.0)
- Risk flags without proper quotes are filtered out server-side
- This is informational, NOT legal advice (disclaimer required)
- Risk score guidelines: 0-25 Safe, 26-50 Caution, 51-75 High Risk, 76-100 Do Not Sign
- Industry playbooks provide mode-specific red flags and "commonly seen vs unusual" guidance
