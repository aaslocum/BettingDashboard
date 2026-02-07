# Super Bowl Party App

A full-stack web application for hosting Super Bowl watch parties with a squares pool game, live betting odds, and an NBC-style TV display mode.

Built for **Super Bowl LX** - Seattle Seahawks vs New England Patriots.

## Features

- **Squares Pool Game** - 10x10 grid where players claim squares. Admin locks the grid, numbers are randomly assigned, and winners are determined by score digits at the end of each quarter.
- **Multi-Party Support** - Host multiple games with configurable bet amounts and prize distributions.
- **Live Betting Odds** - Moneyline, spread, and totals from The Odds API (DraftKings). Falls back to mock data when no API key is configured.
- **Player Props** - Passing yards, rushing yards, receiving yards, receptions, and anytime TD props.
- **Live Game Stats** - Team and player statistics via ESPN API, with mock data fallback.
- **Auto-Sync** - Automatically fetches scores and team info every 10 seconds during the game.
- **TV Display Mode** - Full-screen NBC-style layout with rotating stats panels, scoreboard, and a scrolling odds ticker. Designed for projector/TV output.
- **Smart Likelihood Visualization** - Squares grid highlights which squares are most likely to win based on current score and common scoring patterns.
- **Player Statistics** - Tracks each player's squares owned, winnings, and net position. Admin view shows collection and payout summaries.

## Quick Start

```bash
# Install dependencies
npm install

# (Optional) Add your Odds API key
cp server/.env.example server/.env
# Edit server/.env and add your key from https://the-odds-api.com

# Start both frontend and backend
npm run dev
```

- **Player view**: http://localhost:3000
- **Admin panel**: http://localhost:3000/admin
- **TV display**: http://localhost:3000/display
- **API server**: http://localhost:3001

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ODDS_API_KEY` | _(empty)_ | API key from [The Odds API](https://the-odds-api.com). Uses mock data if not set. |
| `PORT` | `3001` | Backend server port |

## Tech Stack

- **Frontend**: React 18, React Router, Tailwind CSS, Vite
- **Backend**: Express.js, Node.js (ES modules)
- **Data**: JSON file persistence (`data/` directory)
- **APIs**: The Odds API (betting odds), ESPN (live game stats)

## Game Flow

1. **Setup** - Create a game, set bet amount and prize distribution. Players claim squares on the grid.
2. **Lock** - Admin locks the grid. Numbers 0-9 are randomly assigned to each axis.
3. **Game Day** - Enable auto-sync for live score updates. Scores determine the winning square each quarter (last digit of each team's score).
4. **Payouts** - Admin marks quarter winners. Prize distribution defaults to Q1: 15%, Halftime: 30%, Q3: 15%, Final: 40%.

## Project Structure

```
BettingDashboard/
├── client/              # React frontend (Vite)
│   └── src/
│       ├── components/  # SquaresGrid, OddsDisplay, Scoreboard, etc.
│       ├── pages/       # PlayerPage, AdminPage, DisplayPage
│       ├── hooks/       # Data fetching hooks
│       ├── context/     # Game context (multi-game state)
│       └── utils/       # Helper functions
├── server/              # Express backend
│   ├── routes/          # API route handlers
│   └── services/        # Odds, ESPN, sync, data persistence
├── data/                # Game state JSON files
│   ├── games-index.json
│   └── games/           # Individual game files
└── package.json         # Workspace root
```
