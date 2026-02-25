# Redline IQ - Contract Analysis Application

### Overview
Redline IQ is a contract analysis web application designed to empower individuals with AI-powered tools to understand, manage, and mitigate risks associated with legal contracts. It acts as a "digital lawyer in your pocket," providing plain-English summaries, risk detection, key term extraction, negotiation guidance, contract monitoring, and emergency legal triage. The project aims to make legal understanding accessible to ordinary people, helping them navigate contracts with confidence.

### User Preferences
- Emojis are NOT used anywhere in the UI (lucide-react icons only)
- All risk flags must be grounded with exact clause quotes (minimum 10 characters)
- Confidence scores are validated (0.0 - 1.0)
- Risk flags without proper quotes are filtered out server-side
- This is informational, NOT legal advice (disclaimer required and visible on mobile)
- Risk score guidelines: 0-25 Safe, 26-50 Caution, 51-75 High Risk, 76-100 Do Not Sign
- Industry playbooks provide mode-specific red flags and "commonly seen vs unusual" guidance
- Legal disclaimer visible: Desktop sidebar footer + Mobile compact strip above bottom nav
- UI polished with gradient accents, rounded elements, backdrop-blur effects, smooth scrolling, and custom scrollbar styling

### System Architecture

**Frontend (React + TypeScript)**
-   **Framework**: Vite + React with TypeScript
-   **Routing**: Wouter
-   **State Management**: TanStack Query v5
-   **UI Components**: Shadcn/UI with Radix primitives
-   **Styling**: Tailwind CSS with custom design tokens (Primary: Blue #199 89% 48%; Dark mode supported)
-   **UI/UX Decisions**:
    -   Ultra-modern mobile-first design with a focus on clarity and ease of use.
    -   Responsive layout: Sidebar on desktop (768px+), bottom tab bar on mobile for navigation (Home, Scan, Chat, History, More).
    -   Visual risk heatmap using color-coded sections (Safe/Caution/Danger).
    -   Custom RedlineIQ branded authentication pages (Login, Register) with secure bcryptjs password hashing (12 salt rounds).
    -   User data isolation ensuring users only access their own data.

**Backend (Express + TypeScript)**
-   **Framework**: Express.js
-   **Database**: PostgreSQL with Drizzle ORM
-   **Authentication**: Custom email/password authentication system with branded pages and secure session management using `express-session` and `connect-pg-simple`. Protected routes enforce authentication.
-   **Core Features**:
    -   **Contract Upload & Analysis**: Supports PDF, DOCX, DOC, and image files (camera capture), with text paste option. Features industry mode selection and optional risk preferences for personalized analysis.
    -   **Verdict Engine**: Provides a 0-100 risk score, verdict labels (Safe, Caution, High Risk, Do Not Sign), top 3 risks, and negotiation priorities.
    -   **AI Analysis**: Delivers plain-English summaries, risk flags with exact clause quotes, industry-specific red flags, "commonly seen" vs "unusual" clause tagging, key term extraction, and confidence scores.
    -   **Negotiation Guidance**: Offers explanations of clauses, reasons for risk, suggested changes (plain and formal), and negotiation scripts.
    -   **Red Flag Shield (Quick Scan)**: Instant analysis of pasted text for red flags.
    -   **Legal Guardian Dashboard**: Centralized dashboard with a circular score indicator, quick action grid, and visual urgency badges.
    -   **Signed Contracts Monitoring**: Tracks signed contracts, deadlines, and obligations.
    -   **Negotiation Coach**: Provides strategic responses in different tones for negotiation scenarios.
    -   **Emergency Mode**: Legal triage providing relevant contracts, clauses, and next steps for user-described problems.
    -   **Contract Obligations**: Tracks payments, renewals, and termination windows with reminders.
    -   **Company Intelligence**: Anonymized counterparty data and risk patterns.
    -   **Life Command Center**: Comprehensive dashboard with guardian alerts, legal score, quick stats, recent scans, active obligations, and quick action grid.
    -   **Screenshot Intelligence (Universal Clarity Engine)**: AI analysis of text, files, or photos for meaning, importance, next steps, deadlines, consequences, and hidden catches with risk-level coloring.
    -   **Ask-Anytime Advocate Chat**: Memory-enabled AI chat leveraging user contracts, obligations, and preferences for contextual guidance.
    -   **Recurring Obligation Tracker**: Manages subscriptions, insurance, memberships, and other life commitments with due dates and auto-renew/exit window warnings.
    -   **Personal Guardian Mode**: Background monitoring categorizing obligations as Urgent, Due Soon, or Safe.
    -   **Legal & Life Memory Engine**: Auto-saves user preferences and context from advocate chat.
    -   **Bonus Features**: "Explain Like I'm 12," "What If? Simulator," "Contract Expiry Radar," "Is This Normal?," "Share-Safe Summary," and "Trust Seal."
    -   **Notification System**: In-app notifications for contract deadlines and obligation reminders. Bell icon with unread count in header. Generate reminders from upcoming deadlines.
    -   **Contract Comparison**: Side-by-side diff view comparing contract versions. Upload revised versions and see risk score changes, added/removed clauses.
    -   **Shareable Summary Links**: Generate public share links for contract summaries. Public view at /shared/:token accessible without authentication. Links expire after 7 days.
    -   **Onboarding Tutorial**: 5-step walkthrough for first-time users. Stored in localStorage (redlineiq_onboarding_complete). Can be skipped.
    -   **Favorites/Pinned Contracts**: Star/pin contracts on History page. Favorites tab to filter pinned contracts.
    -   **Weekly Legal Health Digest**: Legal score, urgent alerts, upcoming deadlines, auto-renew warnings, and contract stats.
    -   **Template Library**: 6 pre-loaded contract templates (NDA, Freelance, Lease, Employment, SaaS, Vendor) with annotations, risk-level coloring, and common red flags.
    -   **Re-Analysis After Edits**: Upload revised contract version from contract detail page. Creates new version and navigates to comparison view.
    -   **Account Deletion**: Full atomic transaction for user data removal upon account deletion.

### External Dependencies
-   **AI**: OpenAI GPT-5.2 via Replit AI Integrations
-   **Database**: PostgreSQL
-   **ORM**: Drizzle ORM
-   **Session Store**: `connect-pg-simple` for PostgreSQL session storage
-   **Password Hashing**: `bcryptjs`
-   **File Parsing**: `pdf-parse`, `mammoth` (for DOCX), OpenAI Vision (for images)
-   **UI Icons**: `lucide-react`