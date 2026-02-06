# DECIVUE Frontend

React-based decision management dashboard with real-time monitoring and visualization.

## Features

- **Decision Health Overview**: Visual circular progress indicators showing decision health metrics
- **Decision Log**: Comprehensive table view of all decisions with status tracking
- **Organization Overview**: Side panel for reviewing assumptions and notifications
- **Responsive Design**: Fully responsive layout with Tailwind CSS
- **Animated Components**: Smooth animations for progress indicators

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- Lucide React (icons)

## Project Structure

```
src/
├── components/
│   ├── Sidebar.jsx
│   ├── CircularProgressCard.jsx
│   ├── DecisionHealthOverview.jsx
│   ├── DecisionLogTable.jsx
│   └── OrganisationOverview.jsx
├── App.jsx
├── main.jsx
└── index.css
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Open your browser and navigate to http://localhost:5173

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Color Palette

- Primary Red: #E53761
- Primary Blue: #3788E5
- Background White: #F2F5FA
- Black: #000000
- Status Green: #10B981
- Status Orange: #F59E0B

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## Connecting to Backend

The frontend will connect to the backend API running on http://localhost:3001 (to be configured).

## License

MIT
