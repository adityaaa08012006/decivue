# DECIVUE - Deterministic Decision Monitoring System

A comprehensive decision-monitoring platform that treats decisions as living entities whose validity can quietly degrade over time.

**Philosophy**: The system does not replace human judgment — it highlights when judgment is needed.

## Project Structure

```
decivue/
├── frontend/          # React dashboard (Vite + Tailwind CSS)
├── backend/           # Node.js/TypeScript backend (Express + Supabase)
└── README.md          # This file
```

## Features

### Frontend
- **Decision Health Overview**: Visual indicators showing decision health metrics
- **Decision Log**: Comprehensive table view with status tracking
- **Organization Overview**: Assumption and notification management
- **Responsive Design**: Fully responsive with Tailwind CSS

### Backend
- **Deterministic Rule Engine**: Pure, testable decision evaluation logic
- **Event-Driven Architecture**: Automatic re-evaluation on changes
- **Supabase Integration**: PostgreSQL database with real-time capabilities
- **Explainable Traces**: Step-by-step evaluation explanations

## Decision Lifecycle States

Decisions may be in exactly one of the following states:

- **STABLE** – All good, no action needed
- **UNDER_REVIEW** – System signals "please review this" (time or weak signals)
- **AT_RISK** – System signals "urgent attention needed" (dependency risk or drifting assumptions)
- **INVALIDATED** – Hard failure (constraints violated or assumptions broken)
- **RETIRED** – Human-closed, no longer evaluated

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account (for backend database)

### Quick Start

1. **Install dependencies**

   ```bash
   # Install root dependencies
   npm install

   # Install all project dependencies (frontend + backend)
   npm run install:all
   ```

2. **Configure Backend**

   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

3. **Set up Supabase Database**
   - Create a Supabase project
   - Run the schema migration (see backend/README.md)

4. **Run Development Servers**

   ```bash
   # Run frontend only
   npm run dev

   # Run backend only
   npm run dev:backend

   # Run both concurrently
   npm run dev:all
   ```

   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001

## Available Scripts

### Root Level

- `npm run dev` - Start frontend development server
- `npm run dev:backend` - Start backend development server
- `npm run dev:all` - Start both frontend and backend
- `npm run build` - Build both frontend and backend
- `npm run test` - Run backend tests
- `npm run install:all` - Install dependencies for both projects

### Frontend (in frontend/ directory)

- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Backend (in backend/ directory)

- `npm run dev` - Start backend with hot reload
- `npm run build` - Compile TypeScript
- `npm start` - Run compiled server
- `npm test` - Run tests with Jest

## Architecture

### Decision Engine (5-Step Evaluation)

1. **Constraint Validation** - Hard invalidation if organizational constraints violated
2. **Dependency Evaluation** - Propagate risk from dependent decisions (do not auto-invalidate)
3. **Assumption Check** - Invalidate if broken, flag risk if shaky
4. **Health Decay** - Apply time-based health decay (internal signal only)
5. **Lifecycle State Update** - Determine final state

**CRITICAL**: Health is an internal signal only, never authoritative. Only broken assumptions or violated constraints can cause INVALIDATED.

### Event System

- Changes emit events (DECISION_CREATED, ASSUMPTION_UPDATED, etc.)
- Event handlers trigger automatic re-evaluation
- Full audit trail of all state transitions

## Tech Stack

### Frontend

- React 18
- Vite
- Tailwind CSS
- Lucide React (icons)

### Backend

- Node.js + TypeScript
- Express
- Supabase (PostgreSQL)
- Jest (testing)
- Winston (logging)

## Color Palette

- Primary Red: #E53761
- Primary Blue: #3788E5
- Background White: #F2F5FA
- Black: #000000
- Status Green: #10B981
- Status Orange: #F59E0B

## Contributing

See individual README files in frontend/ and backend/ directories for detailed documentation.

## License

MIT
