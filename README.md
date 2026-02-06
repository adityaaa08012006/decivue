# Decivue - Decision Management Dashboard

A modern decision management dashboard built with React, Vite, and Tailwind CSS.

## Features

- **Decision Health Overview**: Visual circular progress indicators showing decision health metrics
- **Decision Log**: Comprehensive table view of all decisions with status tracking
- **Organisation Overview**: Side panel for reviewing assumptions and notifications
- **Responsive Design**: Fully responsive layout with Tailwind CSS
- **Animated Components**: Smooth animations for progress indicators

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
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

3. Open your browser and navigate to the URL shown in the terminal (usually http://localhost:5173)

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Color Palette

- Primary Red: #E53761
- Primary Blue: #3788E5
- Background White: #F2F5FA
- Black: #000000
- Status Green: #10B981
- Status Orange: #F59E0B

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

## Technologies Used

- React 18
- Vite
- Tailwind CSS
- Lucide React (icons)
