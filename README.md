# Gary Dashboard

A custom control center for managing OpenClaw agents, sessions, missions, and more. Built with Next.js and Tailwind CSS.

![Dashboard Preview](https://img.shields.io/badge/status-running-success)

## What is this?

This dashboard provides a web-based interface to interact with your OpenClaw setup without using the command line. It's designed to be a central hub for managing AI agents, viewing logs, searching memory, and controlling browser automation.

## Features

### 🎯 Swarm Missions
- Dispatch multi-agent missions (Analyst, Researcher, Planner)
- Run single-agent tasks
- View mission history and outputs
- Real-time streaming results

### ⚙️ Ops Center
- **Admin Controls**: Restart gateway, run diagnostics
- **Skills**: View available skills and their status
- **Cron Jobs**: Manage scheduled tasks
- **Agents**: Monitor all 5 agents (main, analyst, researcher, planner, coder)
- **Channels**: Check Telegram connection status

### 💬 Chat
- Chat directly with any agent
- View conversation history
- Auto-scroll message view
- Real-time responses

### 🔖 Bookmarks
- Save mission outputs
- Tag and organize bookmarks
- Quick reference for important information

### 📜 Logs
- Stream OpenClaw gateway logs in real-time
- Switch between log files (gateway, errors, dashboard)
- Auto-scroll and clear controls

### 🧠 Memory
- Search across MEMORY.md and daily notes
- Browse memory files by date
- View full content of any memory file

### 📁 Files
- Browse workspace file system
- Edit text files directly in the browser
- Create new files
- Syntax highlighting for code

## Technology Stack

- **Framework**: [Next.js](https://nextjs.org/) 16.1.6
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Lucide React](https://lucide.dev/) (icons)
- **Runtime**: Node.js
- **Process Manager**: macOS LaunchAgent

## Architecture

### API Routes
The dashboard exposes several API endpoints:

- `/api/status` - OpenClaw gateway status
- `/api/sessions` - List active sessions
- `/api/sessions/history` - Get session message history
- `/api/agent/stream` - Stream agent responses (SSE)
- `/api/swarm/stream` - Multi-agent mission streaming
- `/api/missions` - CRUD operations for missions
- `/api/cron` - Cron job management
- `/api/skills/list` - Available skills
- `/api/channels/status` - Channel health status
- `/api/logs/stream` - Log streaming
- `/api/memory/*` - Memory file operations
- `/api/files/*` - File system operations
- `/api/bookmarks` - Bookmark management

### Data Storage
- **Missions**: `data/missions.json`
- **Bookmarks**: `data/bookmarks.json`
- **Admin Key**: `data/admin-key.txt`
- **Logs**: `logs/` directory

### Authentication
The dashboard uses an admin key for sensitive operations (cron management, gateway restart). The key is stored in a local file and checked via HTTP headers.

## Setup

### Prerequisites
- macOS
- Node.js 22+
- OpenClaw installed and configured
- Telegram bot configured (optional, for notifications)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/garyclaw/test-repo.git
cd test-repo
```

2. Install dependencies:
```bash
npm install
```

3. Build the application:
```bash
npm run build
```

4. Start the server:
```bash
npm start
```

The dashboard will be available at http://localhost:3000

### Running as a Service (macOS)

A LaunchAgent is configured to keep the dashboard running:

```bash
launchctl load ~/Library/LaunchAgents/ai.openclaw.gary-dashboard.plist
```

To restart:
```bash
launchctl kickstart -k gui/501/ai.openclaw.gary-dashboard
```

## Configuration

### Environment Variables

Create a `.env.local` file:

```bash
# Optional: Override default ports
PORT=3000

# Optional: Custom OpenClaw path
OPENCLAW_BIN=/path/to/openclaw
```

### Admin Key

The admin key is auto-generated on first run and stored in `data/admin-key.txt`. Use this key to unlock admin features in the Ops tab.

## Usage Guide

### Starting a Mission

1. Go to the **Swarm** tab
2. Enter your prompt (e.g., "Research competitors for my product")
3. Select mode: "single" or "swarm"
4. Choose an agent
5. Click **Dispatch**
6. Watch real-time results stream in

### Checking Logs

1. Go to the **Logs** tab
2. Select a log file from the dropdown
3. Click **Start** to begin streaming
4. Use **Auto-scroll** to follow new entries
5. Click **Clear** to reset the view

### Managing Files

1. Go to the **Files** tab
2. Navigate folders by clicking on them
3. Click a file to edit
4. Make changes in the editor
5. Click **Save** when done (only enabled if changes were made)
6. Use **New** button to create files

### Searching Memory

1. Go to the **Memory** tab
2. Type a search query in the search box
3. Click **Search**
4. Click any result to view the full file

### Chatting with Agents

1. Go to the **Chat** tab
2. Select or enter a session key
3. Choose an agent from the dropdown
4. Type a message and hit Enter or click **Send**
5. View the conversation history below

## Security Notes

- The dashboard binds to `127.0.0.1` (localhost only) by default
- Admin operations require the admin key
- File access is restricted to the OpenClaw workspace
- Only specific file types can be edited (.md, .json, .ts, .js, etc.)

## Troubleshooting

### Dashboard won't start
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill existing process
kill -9 $(lsof -t -i :3000)
```

### Gateway connection issues
```bash
# Check OpenClaw status
openclaw status

# Restart gateway
openclaw gateway restart
```

### Logs not streaming
- Verify the gateway is running
- Check file permissions on `~/.openclaw/logs/`

## Development

### Project Structure
```
gary-dashboard/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── _lib/          # Shared utilities
│   │   ├── admin/         # Admin endpoints
│   │   ├── agent/         # Agent streaming
│   │   ├── bookmarks/     # Bookmark management
│   │   ├── channels/      # Channel status
│   │   ├── cron/          # Cron operations
│   │   ├── files/         # File operations
│   │   ├── logs/          # Log streaming
│   │   ├── memory/        # Memory operations
│   │   ├── missions/      # Mission management
│   │   ├── sessions/      # Session operations
│   │   └── swarm/         # Multi-agent missions
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   └── app-layout.tsx     # Main UI layout
├── data/                  # Local data storage
├── logs/                  # Application logs
├── scripts/               # Utility scripts
├── public/                # Static assets
└── README.md             # This file
```

### Adding New Features

1. Create API route in `app/api/feature-name/route.ts`
2. Add UI section in `components/app-layout.tsx`
3. Update tab navigation
4. Test locally with `npm run dev`

## Credits

Built by Gary (OpenClaw agent) for Phillip Elliott.

## License

Private - For personal use only.

---

**Note**: This dashboard is designed to work specifically with the OpenClaw ecosystem. For more information about OpenClaw, visit https://openclaw.ai
