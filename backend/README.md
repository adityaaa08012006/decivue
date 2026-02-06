# DECIVUE Backend

Backend server for the DECIVUE deterministic decision-monitoring system.

## Architecture

```
backend/
├── src/
│   ├── api/              # API/Service Layer
│   ├── engine/           # Decision Engine (Rule Engine)
│   ├── events/           # Event System
│   ├── data/             # Data Layer (Repositories & Models)
│   └── utils/            # Utilities
└── tests/                # Unit and integration tests
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- A Supabase project (for database)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template and configure:

```bash
cp .env.example .env
```

3. Update `.env` with your Supabase credentials:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anonymous key

4. Set up the database schema in Supabase (see Database Setup below)

### Development

Run the development server with hot reload:

```bash
npm run dev
```

The server will start on `http://localhost:3001`

### Build

Compile TypeScript to JavaScript:

```bash
npm run build
```

### Production

Run the compiled server:

```bash
npm start
```

## Database Setup

Execute the following SQL in your Supabase SQL editor to create the required tables:

```sql
-- See the schema definition in the project documentation
```

## API Endpoints

- `GET /health` - Health check
- `GET /api` - API information
- `GET /api/decisions` - List all decisions
- `GET /api/decisions/:id` - Get decision by ID
- `POST /api/decisions` - Create new decision
- `PUT /api/decisions/:id` - Update decision
- `DELETE /api/decisions/:id` - Delete decision
- `POST /api/decisions/:id/evaluate` - Trigger evaluation

## Decision Engine

The deterministic engine evaluates decisions through 5 phases:

1. **Constraint Validation** - Hard fail if violated
2. **Dependency Evaluation** - Propagate risk from dependencies
3. **Assumption Check** - Invalidate if assumptions are broken
4. **Confidence Decay** - Apply time-based decay
5. **Lifecycle State Update** - Determine final lifecycle state

## Event System

The system uses an event-driven architecture:

- Events are emitted when state changes occur
- Handlers listen for events and trigger re-evaluation
- All state transitions are traceable via events

## Testing

Run tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:coverage
```

## License

MIT
