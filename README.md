# DECIVUE - Deterministic Decision Intelligence Platform

> **Stronger Decisions. Smarter Organizations.**

DECIVUE is an intelligent decision-monitoring platform that helps teams make adaptive, data-driven decisions with clarity. Monitor decision health, track assumptions, detect conflicts, and adapt before problems escalate.

**Core Philosophy**: The system does not replace human judgment — it highlights when judgment is needed.

---

## 🎯 What is DECIVUE?

Organizations make hundreds of strategic decisions, but those decisions can quietly degrade over time as assumptions become invalid, conflicts emerge, or dependencies change. DECIVUE treats decisions as **living entities** that need continuous monitoring and adaptive governance.

### Key Problems We Solve

1. **Silent Decision Degradation**: Assumptions change, but old decisions remain unquestioned
2. **Conflict Blindness**: Decisions contradict each other without anyone noticing
3. **Manual Governance Overhead**: Teams waste time tracking dependencies and approvals
4. **Reactive Crisis Management**: Problems are discovered too late

---

## ✨ Core Features

### 🔍 **Decision Health Monitoring**

- Real-time health scoring based on assumption validity
- Visual status indicators: Stable, At Risk, Critical, Expired
- Historical health trends with evaluation tracking
- Automated degradation alerts

### ⚔️ **Intelligent Conflict Detection**

- **Assumption Conflicts**: Detects contradictory assumptions across decisions
- **Decision Conflicts**: Identifies resource competition, contradicting goals
- **Constraint Violations**: Flags budget, policy, and business rule violations
- Automatic conflict discovery on new decision/assumption creation

### 📊 **Structured Decision Framework**

- **Parameter Templates**: Pre-defined categories for consistent decision-making
- **Sub-category Dropdowns**: Industry-specific templates (tech, retail, healthcare, etc.)
- **Assumption Parameters**: Structured data capture (numeric ranges, budgets, timelines)
- **Universal vs. Custom Assumptions**: Org-wide shared assumptions or decision-specific

### 🔄 **Version Control & Audit**

- Complete decision history with change tracking
- Version snapshots for every substantial change
- Lifecycle transitions: Draft → Active → Review Required → Retired → Invalidated
- Governance audit logs for approvals and rejections

### 👥 **Adaptive Governance**

- **Role-Based Workflows**: Different capabilities for Members, Leads, Admins
- **Tiered Approval System**: Operational, Strategic, Critical decision tiers
- **Edit Request Workflow**: Request → Review → Approve/Reject with justification
- **Lock/Unlock Mechanism**: Prevent changes during critical review periods

### 📈 **Advanced Decision Intelligence**

- **Decision Flow Visualization**: Interactive graph showing dependencies and relationships
- **Team Member Reports**: Individual contribution tracking and decision ownership
- **Deprecation Outcomes**: Track why decisions were retired (failed, succeeded, superseded)
- **Time Jump Simulation**: Project decision states forward in time based on expiry dates

### 🔔 **Smart Notifications**

- Severity levels: Info, Warning, Critical
- Notification types: Assumption conflicts, constraint violations, review deadlines, health degradation
- User preferences: Email + in-app notifications
- Batch notification processing every 15 minutes

### 📤 **Decision Import System**

- Bulk upload via CSV/PDF/DOCX
- AI-powered parsing with Gemini API
- Duplicate detection and conflict checking
- Preview and validate before committing

---

## 🏗️ Architecture

### Technology Stack

**Frontend**

- React 18 with Vite
- Tailwind CSS for styling
- Framer Motion for animations
- React Flow for decision visualization
- Lucide React for icons

**Backend**

- Node.js with TypeScript
- Express.js REST API
- Supabase PostgreSQL database
- Google Gemini AI for document parsing
- Winston for logging

**Infrastructure**

- Vercel (Frontend hosting)
- Railway (Backend hosting)
- Supabase (Database, Auth, RLS)
- Resend (Email notifications)

### Project Structure

```
decivue/
├── frontend/                      # React dashboard
│   ├── public/                    # Static assets (logo, videos)
│   ├── src/
│   │   ├── components/            # React components
│   │   │   ├── LandingPage.jsx   # Homepage
│   │   │   ├── DecisionHealthOverview.jsx
│   │   │   ├── DecisionLogTable.jsx
│   │   │   ├── DecisionFlowGraph/ # Visualization
│   │   │   ├── AssumptionsPage.jsx
│   │   │   ├── TeamPage.jsx      # Team management
│   │   │   ├── ReportsPage.jsx   # Analytics
│   │   │   └── ...
│   │   ├── contexts/              # React contexts (Auth, Theme)
│   │   ├── services/              # API client
│   │   └── utils/                 # Helper functions
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── backend/                       # Node.js/TypeScript API
│   ├── migrations/                # Database migrations
│   │   ├── 006_add_authentication.sql
│   │   ├── 007_enable_rls_with_registration_support.sql
│   │   ├── 033_fix_version_history_timeline.sql
│   │   └── 034_fix_edit_approval_change_type.sql
│   ├── scripts/                   # Utility scripts
│   │   ├── seed-plot-armor-complete.ts  # Demo data seeder
│   │   ├── clear-all-data.ts            # Database reset
│   │   ├── apply-migration-034.ts       # Migration tool
│   │   └── reload-schema.ts             # Schema refresh
│   ├── src/
│   │   ├── api/                   # REST API routes & controllers
│   │   │   ├── routes/            # Express routes
│   │   │   │   ├── auth.ts
│   │   │   │   ├── decisions.ts
│   │   │   │   ├── assumptions.ts
│   │   │   │   ├── assumption-conflicts.ts
│   │   │   │   ├── decision-conflicts.ts
│   │   │   │   ├── constraint-violations.ts
│   │   │   │   ├── notifications.ts
│   │   │   │   ├── reports.ts
│   │   │   │   ├── time-simulation.ts
│   │   │   │   └── import-decisions.ts
│   │   │   └── controllers/       # Business logic
│   │   │       ├── decision-controller.ts
│   │   │       └── conflict-detector.ts
│   │   ├── services/              # External integrations
│   │   │   ├── gemini-service.ts  # AI parsing
│   │   │   └── email-service.ts   # Resend integration
│   │   └── server.ts              # Express app entry
│   ├── schema.sql                 # Full database schema
│   ├── .env                       # Environment configuration
│   ├── package.json
│   └── tsconfig.json
│
├── docs/                          # Feature documentation
│   ├── DECISION_CONFLICTS_FEATURE.md
│   ├── QUICK_START_ADVANCED_FEATURES.md
│   ├── STRUCTURED_DECISIONS_GUIDE.md
│   └── TEAM_REPORTS_FEATURE.md
│
├── .gitignore
├── nixpacks.toml                  # Railway build config
├── railway.json                   # Railway deployment config
├── package.json                   # Monorepo root
└── README.md                      # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **npm** or **yarn**
- **Supabase** account (free tier works)
- **Gemini API key** (for document import feature)
- **Resend API key** (for email notifications)

### Local Development Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/your-org/decivue.git
cd decivue
```

#### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

#### 3. Configure Environment Variables

**Backend** (`backend/.env`):

```env
# Server
NODE_ENV=development
PORT=3001
LOG_LEVEL=info

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Gemini AI (for document import)
GEMINI_API_KEY=your-gemini-api-key
GEMINI_API_KEY_FALLBACK=your-fallback-key

# Email Notifications
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=noreply@yourdomain.com
FRONTEND_URL=http://localhost:3000

# Notifications
EMAIL_NOTIFICATIONS_ENABLED=true
NOTIFICATION_CHECK_CRON=*/15 * * * *
```

**Frontend** (`frontend/.env`):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3001/api
```

#### 4. Set Up Database

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the schema:
   ```bash
   # In Supabase SQL Editor, execute:
   cd backend
   # Copy contents of schema.sql and execute in Supabase
   ```
3. Run migrations:
   ```bash
   # In Supabase SQL Editor, execute in order:
   # 006_add_authentication.sql
   # 007_enable_rls_with_registration_support.sql
   # 033_fix_version_history_timeline.sql
   # 034_fix_edit_approval_change_type.sql
   ```

Or apply migration 034 via script:

```bash
cd backend
npx ts-node scripts/apply-migration-034.ts
```

#### 5. Seed Demo Data (Optional)

```bash
cd backend
npm run seed-plot-armor
```

This creates the **"Plot Armor"** coffee shop demo organization with:

- 20 business decisions spanning 220 days
- 16 assumptions with structured parameters
- 5 assumption conflicts
- 4 decision conflicts
- 10 decisions with expiry dates
- Complete governance workflow examples

#### 6. Start Development Servers

**Terminal 1 - Backend:**

```bash
cd backend
npm run dev
# Server runs on http://localhost:3001
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
# App runs on http://localhost:3000
```

---

## 📦 Production Deployment

### Frontend (Vercel)

1. **Connect Repository**: Link your GitHub repo to Vercel
2. **Configure Project**:
   - Framework: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. **Environment Variables**:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_API_URL=https://your-backend.railway.app/api
   ```
4. **Deploy**: Vercel auto-deploys on git push

### Backend (Railway)

1. **Create New Project**: Deploy from GitHub repo
2. **Configure Service**:
   - Root Directory: `backend`
   - Build Command: (auto-detected from nixpacks.toml)
   - Start Command: `npm run start`
3. **Environment Variables**: Add all backend env vars from `.env`
4. **Generate Domain**: Settings → Networking → Generate Domain
5. **Update Frontend**: Set `VITE_API_URL` in Vercel to Railway URL

### Post-Deployment

1. ✅ Run migration 034 from local machine (connects to Supabase)
2. ✅ Test API health: `https://your-backend.railway.app/health`
3. ✅ Test frontend: `https://your-app.vercel.app`
4. ✅ Verify login and decision creation
5. ✅ Check governance approval workflow

---

## 🎮 Usage Guide

### For Team Members

1. **View Decisions**: See all organization decisions in Decision Log
2. **Check Health**: Monitor decision health indicators
3. **Submit Edits**: Request changes via Edit Request workflow
4. **Review Conflicts**: Check Assumption Conflicts and Decision Conflicts pages
5. **Receive Notifications**: Get alerts for critical issues

### For Team Leads

Everything Members can do, plus:

- **Approve/Reject Edit Requests**: Governance oversight
- **Create Strategic Decisions**: Higher-tier decision authority
- **Lock/Unlock Decisions**: Prevent changes during review
- **Generate Team Reports**: View individual contributions

### For Administrators

Full system access:

- **Manage Organizations**: Create and configure org settings
- **Oversight All Decisions**: Cross-team visibility
- **System Configuration**: Manage templates and parameter categories
- **User Management**: Add/remove team members

---

## 📚 Key Concepts

### Decision Lifecycle

```
DRAFT → ACTIVE → REVIEW_REQUIRED → RETIRED/INVALIDATED
```

- **DRAFT**: Initial creation, not yet implemented
- **ACTIVE**: Live decision in effect
- **REVIEW_REQUIRED**: Health degraded, needs reassessment
- **RETIRED**: Gracefully ended (succeeded, replaced, or failed)
- **INVALIDATED**: Forcibly ended due to invalid assumptions

### Health Scoring

Decisions are scored 0-100 based on:

- Assumption validity (invalid assumptions reduce score)
- Unresolved conflicts (each conflict deducts points)
- Constraint violations (policy/budget breaches)
- Review staleness (time since last review)

### Governance Tiers

1. **OPERATIONAL**: Day-to-day decisions, auto-approved
2. **STRATEGIC**: Mid-level impact, requires lead approval
3. **CRITICAL**: High-stakes decisions, admin approval + lock mechanism

### Assumption Scopes

- **UNIVERSAL**: Org-wide shared assumptions (e.g., "Market growth rate = 12%")
- **CUSTOM**: Decision-specific assumptions (e.g., "This store's traffic = 500/day")

---

## 🧪 Testing & Demo Data

### Plot Armor Coffee Shop Scenario

The seeder creates a realistic coffee shop chain with:

**Business Context:**

- Regional coffee shop chain expanding in competitive market
- Making decisions about locations, operations, sustainability
- All non-technical business decisions

**Demo Features:**

- ✅ Decision conflicts (competing for same budget/resources)
- ✅ Assumption conflicts (contradictory market assumptions)
- ✅ Time jump simulation (10 decisions with expiry dates)
- ✅ Version control (30+ historical versions)
- ✅ Governance workflow (edit requests and approvals)
- ✅ Deprecation tracking (succeeded, failed, superseded outcomes)
- ✅ Evaluation trends (health signal changes over time)

---

## 🔑 API Endpoints

### Authentication

- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Decisions

- `GET /api/decisions` - List all decisions
- `POST /api/decisions` - Create decision
- `GET /api/decisions/:id` - Get decision details
- `PUT /api/decisions/:id` - Update decision
- `DELETE /api/decisions/:id` - Delete decision
- `POST /api/decisions/:id/retire` - Retire decision

### Governance

- `POST /api/decisions/governance/request-edit` - Request edit approval
- `POST /api/decisions/governance/approve-edit/:id` - Approve/reject edit

### Assumptions

- `GET /api/assumptions` - List assumptions
- `POST /api/assumptions` - Create assumption (auto-detects conflicts)
- `PUT /api/assumptions/:id` - Update assumption
- `DELETE /api/assumptions/:id` - Delete assumption

### Conflicts

- `GET /api/assumption-conflicts` - List assumption conflicts
- `GET /api/assumption-conflicts/detect` - Manual conflict detection
- `POST /api/assumption-conflicts/:id/resolve` - Resolve conflict
- `GET /api/decision-conflicts` - List decision conflicts
- `POST /api/decision-conflicts/:id/resolve` - Resolve conflict

### Reports

- `GET /api/reports/team-member/:userId` - Individual contribution report

### Time Simulation

- `POST /api/time-simulation/jump` - Project decisions forward in time

### Import

- `POST /api/import/preview` - Preview CSV/PDF/DOCX import
- `POST /api/import/commit` - Commit imported decisions

---

## 🛠️ Scripts Reference

### Backend Scripts

```bash
# Seed demo data
npm run seed-plot-armor

# Clear all data from organization
npx tsx scripts/clear-all-data.ts

# Apply latest migration
npx tsx scripts/apply-migration-034.ts

# Reload database schema
npx tsx scripts/reload-schema.ts
```

### Frontend Scripts

```bash
# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- **Supabase** for database and authentication infrastructure
- **Google Gemini** for AI-powered document parsing
- **Resend** for reliable email delivery
- **Vercel** for frontend hosting
- **Railway** for backend hosting

---

## 📧 Support

For questions, issues, or feature requests:

- Open an issue on GitHub
- Documentation: [docs/](./docs/)

---

**Built with ❤️ by the PLOT ARMOR Team**

_Making decisions visible, trackable, and adaptive._
