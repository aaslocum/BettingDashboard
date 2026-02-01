# Super Bowl Party Application

A full-stack web application for hosting Super Bowl parties with live betting odds display and a squares pool game.

## Project Architecture

```
BettingDashboard/
├── server/                 # Express.js backend
│   ├── index.js           # Main server entry point
│   ├── routes/
│   │   ├── odds.js        # Betting odds API endpoints
│   │   ├── game.js        # Player game endpoints
│   │   └── admin.js       # Admin control endpoints
│   ├── services/
│   │   ├── oddsService.js # The Odds API integration
│   │   ├── dataService.js # JSON file data persistence
│   │   └── syncService.js # Auto-sync for live scores
│   └── .env.example       # Environment variables template
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   │   ├── SquaresGrid.jsx    # 10x10 squares grid
│   │   │   ├── OddsDisplay.jsx    # Betting odds display
│   │   │   ├── Scoreboard.jsx     # Score and prize display
│   │   │   ├── ClaimModal.jsx     # Square claiming modal
│   │   │   └── WinnersPanel.jsx   # Quarter winners display
│   │   ├── pages/
│   │   │   ├── PlayerPage.jsx     # Main player interface
│   │   │   ├── AdminPage.jsx      # Admin controls
│   │   │   └── DisplayPage.jsx    # TV display mode
│   │   ├── hooks/
│   │   │   └── useGameData.js     # Data fetching hooks
│   │   ├── utils/
│   │   │   └── helpers.js         # Utility functions
│   │   ├── App.jsx               # Main app with routing
│   │   ├── main.jsx              # React entry point
│   │   └── index.css             # Tailwind CSS styles
│   ├── vite.config.js            # Vite configuration
│   ├── tailwind.config.js        # Tailwind configuration
│   └── postcss.config.js         # PostCSS configuration
├── data/
│   └── game.json                 # Game state persistence
├── package.json                  # Root workspace config
└── CLAUDE.md                     # This file
```

## Features

### 1. Live Betting Odds Display
- Fetches odds from The Odds API (https://the-odds-api.com)
- Shows moneyline, spread, and totals
- Auto-refreshes every 30 seconds
- Falls back to mock data when no API key is configured

### 2. Squares Pool Game ($100 total pool)
- 10x10 grid (100 squares at $1 each)
- Players claim squares by entering their name
- Admin locks grid when all squares are claimed
- Random number assignment (0-9) for each axis after lock
- Prize structure:
  - Q1: $15
  - Halftime: $30
  - Q3: $15
  - Final: $40

### 3. Auto-Sync (Hands-Off Mode)
- Automatically fetches team names and live scores from The Odds API
- Updates every 10 seconds when enabled
- Falls back to simulated game data when no API key configured
- Admin only needs to mark quarter winners

### 4. Display Modes
- **Player View** (`/`): Claim squares, view grid and odds
- **Admin View** (`/admin`): Control game state, auto-sync, quarter payouts
- **TV Display** (`/display`): Full-screen view for projector/TV

## API Endpoints

### Odds API
- `GET /api/odds` - Fetch current betting odds
- `GET /api/odds/mock` - Always return mock data

### Game API
- `GET /api/game` - Get current game state
- `POST /api/game/claim` - Claim a square `{ squareIndex, playerName }`
- `GET /api/game/winner` - Get current potential winner

### Admin API
- `POST /api/admin/reset` - Reset game to initial state
- `POST /api/admin/teams` - Update teams `{ homeTeam, awayTeam }`
- `POST /api/admin/scores` - Update scores `{ homeScore, awayScore }`
- `POST /api/admin/lock` - Lock grid and randomize numbers
- `POST /api/admin/quarter` - Mark quarter winner `{ quarter: 'q1'|'q2'|'q3'|'q4' }`

### Auto-Sync API
- `GET /api/admin/sync/status` - Get current sync status
- `POST /api/admin/sync/start` - Start auto-sync `{ gameId?, interval? }`
- `POST /api/admin/sync/stop` - Stop auto-sync
- `POST /api/admin/sync/now` - Trigger manual sync

## Development

### Prerequisites
- Node.js 18+
- npm 9+

### Setup
```bash
# Install dependencies
npm install

# Copy environment file and add API key (optional)
cp server/.env.example server/.env

# Start development servers (frontend + backend)
npm run dev
```

### Environment Variables
- `ODDS_API_KEY` - API key from https://the-odds-api.com (optional, uses mock data if not set)
- `PORT` - Server port (default: 3001)

### Running
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- TV Display: http://localhost:3000/display

## Tech Stack
- **Frontend**: React 18, React Router, Tailwind CSS, Vite
- **Backend**: Express.js, Node.js
- **Data**: JSON file persistence
- **External API**: The Odds API

## Game Flow

1. **Setup Phase**
   - Enable auto-sync to populate team names automatically (or set manually)
   - Players claim squares (100 squares total)

2. **Lock Phase**
   - Admin locks grid when all squares claimed
   - Numbers 0-9 randomly assigned to each axis

3. **Game Phase (Hands-Off)**
   - Auto-sync updates scores automatically every 10 seconds
   - At end of each quarter, admin marks winner
   - Winner determined by last digit of each team's score

4. **Completion**
   - After Q4 winner is marked, game is complete
   - All prize payouts displayed on screen
