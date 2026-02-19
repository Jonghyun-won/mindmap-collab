# MindMap Collab

Real-time collaborative mind mapping application with WebSocket-based synchronization using Yjs CRDT.

## Features

- 🚀 **Real-time Synchronization** - Instant updates like Google Sheets
- 👥 **Multi-user Collaboration** - Up to 10 concurrent editors
- 🔒 **Conflict-free Editing** - CRDT-based automatic merging
- 🎯 **Real-time Cursors** - See other users' mouse positions
- 👤 **Collaborator Avatars** - Display active users
- ⌨️ **Keyboard Shortcuts** - Enter: sibling node, Ctrl+Enter: child node
- 🎨 **Level-based Colors** - Auto-color by hierarchy level
- 📦 **Box Selection** - Drag to select multiple nodes
- 🔄 **Undo/Redo** - Ctrl+Z for undo
- 💾 **Auto-save** - Auto-save every 30 seconds + manual save
- 🌐 **Web Browser** - No installation required
- 🔐 **JWT Authentication** - Secure user authentication

## Tech Stack

### Backend
- **Python 3.12** - Modern Python runtime
- **FastAPI** - High-performance async web framework
- **uv** - Fast Python package manager
- **psycopg2** - PostgreSQL database driver
- **Supabase PostgreSQL** - Cloud database
- **y-py** - Python Yjs CRDT implementation
- **JWT** - Token-based authentication

### Frontend
- **React 19** - Modern React with concurrent features
- **Vite 7** - Next-generation frontend tooling
- **TypeScript 5.9** - Type-safe JavaScript
- **Tailwind CSS 4** - Utility-first CSS framework
- **shadcn/ui** - Re-usable UI component library
- **React Flow** - Mind map visualization library
- **Yjs** - CRDT engine for real-time collaboration
- **y-websocket** - WebSocket provider for Yjs

### Infrastructure
- **WebSocket** - Real-time bidirectional communication
- **Supabase** - PostgreSQL database + authentication
- **Docker** - Containerized deployment

## Project Structure

```
mindmap-collab-v2/
├── api.yaml                # OpenAPI 3.0 API specification
├── backend/
│   ├── .env                # Environment variables (DATABASE_URL, JWT_SECRET, etc.)
│   ├── .env.example        # Example environment variables
│   ├── Dockerfile          # Backend container configuration
│   ├── pyproject.toml      # Python dependencies (uv package manager)
│   ├── api.py              # FastAPI entrypoint - exposes all functions as HTTP endpoints
│   ├── conn.py             # Database connection module
│   ├── auth/               # Authentication service
│   │   ├── model.py        # Pydantic models (matches api.yaml schemas)
│   │   ├── login.py        # Login endpoint
│   │   ├── register.py     # Registration endpoint
│   │   └── logout.py       # Logout endpoint
│   ├── mindmaps/           # Mind map service
│   │   ├── model.py        # Pydantic models
│   │   ├── list.py         # List mind maps
│   │   ├── get.py          # Get mind map details
│   │   ├── create.py       # Create mind map
│   │   ├── update.py       # Update mind map
│   │   └── delete.py       # Delete mind map
│   └── collaborators/      # Collaborator service
│       ├── model.py        # Pydantic models
│       ├── list.py         # List collaborators
│       ├── add.py          # Add collaborator
│       ├── update.py       # Update permissions
│       └── remove.py       # Remove collaborator
└── frontend/
    ├── .env                # Environment variables (VITE_API_BASE_URL, VITE_WS_URL)
    ├── .env.example        # Example environment variables
    ├── Dockerfile          # Frontend container configuration (multi-stage build)
    ├── package.json        # Node dependencies
    ├── vite.config.ts      # Vite configuration
    ├── tailwind.config.js  # Tailwind CSS configuration
    └── src/
        ├── components/
        │   ├── ui/         # Common UI components (shadcn/ui)
        │   ├── auth/       # Authentication components
        │   ├── mindmap/    # Mind map feature components
        │   └── dashboard/  # Dashboard components
        ├── pages/          # Page components
        ├── contexts/       # React Context providers
        ├── lib/            # Utilities (api-client, etc.)
        ├── types/          # TypeScript types (matches api.yaml schemas)
        │   ├── auth.ts     # Auth types
        │   ├── mindmap.ts  # Mind map types
        │   └── common.ts   # Common types
        └── hooks/          # Custom React hooks
```

## Getting Started

### Prerequisites

- **Python 3.12** - [Download](https://www.python.org/downloads/)
- **Node.js 20+** - [Download](https://nodejs.org/)
- **Docker** (optional for containerized deployment)
- **Supabase account** - [Sign up](https://supabase.com) (free tier)

### Installation

#### 1. Clone the repository

```bash
git clone <repository-url>
cd mindmap-collab-v2
```

#### 2. Backend Setup

```bash
cd backend

# Copy environment variables template
cp .env.example .env

# Edit .env and add your credentials:
# - DATABASE_URL (Supabase PostgreSQL connection string)
# - SUPABASE_KEY (Supabase API key)
# - JWT_SECRET (random secret for JWT tokens)

# Install dependencies (using uv package manager)
uv sync

# Run API server
uv run api.py
```

Backend will start at `http://localhost:8000`
- API documentation: `http://localhost:8000/docs` (Swagger UI)
- OpenAPI spec: `http://localhost:8000/openapi.json`

#### 3. Frontend Setup

```bash
cd frontend

# Copy environment variables template
cp .env.example .env

# Edit .env and add:
# VITE_API_BASE_URL=http://localhost:8000
# VITE_WS_URL=ws://localhost:8000/ws

# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend will start at `http://localhost:5173`

### Environment Variables

#### Backend (`backend/.env`)

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Supabase
SUPABASE_KEY=your-supabase-anon-key

# Authentication
JWT_SECRET=your-random-secret-key

# Python path (required for imports)
PYTHONPATH=.
```

#### Frontend (`frontend/.env`)

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:8000

# WebSocket Configuration
VITE_WS_URL=ws://localhost:8000/ws
```

**Important:** Never commit `.env` files to git. Use `.env.example` for documentation.

### Supabase Database Setup

1. Create a new project at [supabase.com](https://supabase.com)

2. Run the following SQL in the Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Mind maps table
CREATE TABLE mind_maps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  yjs_state BYTEA
);

-- Collaborators table
CREATE TABLE mind_map_collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mind_map_id UUID REFERENCES mind_maps(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('view', 'edit', 'admin')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (mind_map_id, user_id)
);

-- Row Level Security policies
ALTER TABLE mind_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_map_collaborators ENABLE ROW LEVEL SECURITY;

-- Mind maps policies
CREATE POLICY "Users can view mind maps they own or collaborate on"
  ON mind_maps FOR SELECT
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM mind_map_collaborators
      WHERE mind_map_id = mind_maps.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create mind maps"
  ON mind_maps FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update mind maps they own"
  ON mind_maps FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete mind maps they own"
  ON mind_maps FOR DELETE
  USING (auth.uid() = created_by);

-- Collaborators policies
CREATE POLICY "Users can view collaborators of their mind maps"
  ON mind_map_collaborators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM mind_maps
      WHERE id = mind_map_id AND (created_by = auth.uid() OR id IN (
        SELECT mind_map_id FROM mind_map_collaborators WHERE user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Mind map owners can manage collaborators"
  ON mind_map_collaborators FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM mind_maps
      WHERE id = mind_map_id AND created_by = auth.uid()
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_mind_maps_updated_at
  BEFORE UPDATE ON mind_maps
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();
```

## Docker Deployment

### Backend Dockerfile

```bash
cd backend
docker build -t mindmap-backend .
docker run -p 8000:8000 --env-file .env mindmap-backend
```

### Frontend Dockerfile

```bash
cd frontend
docker build -t mindmap-frontend --build-arg VITE_API_BASE_URL=https://api.yourdomain.com .
docker run -p 80:80 mindmap-frontend
```

### Docker Compose (Full Stack)

```bash
docker-compose up -d
```

## Running Individual Services

### Backend

**Important:** All backend commands must be run from the `backend/` directory.

```bash
cd backend

# Start API server
uv run api.py

# Run individual service files (for testing)
uv run auth/login.py
uv run mindmaps/create.py
uv run collaborators/list.py
```

**Why backend/ directory?**
- `.env`'s `PYTHONPATH=.` works relative to current directory
- Allows imports like `from conn import get_db_connection` in all service files
- Running from other directories will cause `ModuleNotFoundError`

### Frontend

```bash
cd frontend

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint
```

## API Documentation

- **OpenAPI Specification:** `/api.yaml` (root directory)
- **Swagger UI:** `http://localhost:8000/docs` (when backend running)
- **ReDoc:** `http://localhost:8000/redoc` (when backend running)

All API endpoints follow the OpenAPI 3.0 specification defined in `api.yaml`.

### Authentication

All authenticated endpoints require a JWT Bearer token:

```bash
Authorization: Bearer <token>
```

Get token from `/auth/login` or `/auth/register` endpoints.

## Keyboard Shortcuts

- `Enter` - Create sibling node (same level)
- `Ctrl + Enter` - Create child node (one level down)
- `Delete` - Delete selected node
- `Ctrl + S` - Manual save
- `Ctrl + Z` - Undo
- `Ctrl + C` - Copy node
- `Ctrl + V` - Paste node

## Multi-selection

- `Shift + Click` - Select individual nodes
- `Drag empty space` - Box select multiple nodes

## Node Editing

- `Double-click` - Edit node text
- `Drag` - Move node (child nodes move together)
- `Drag node to another node` - Change parent (reparenting)

## Real-time Collaboration

- Top-right corner shows active user count
- Other users' cursors shown in real-time
- Color-coded avatars distinguish collaborators
- All changes synchronized instantly

## Development Phases

- ✅ **Phase 1:** Foundation (Auth, Database, Basic UI)
- ✅ **Phase 2:** Mind map visualization (React Flow integration)
- ✅ **Phase 3:** Real-time collaboration (Yjs + WebSocket)
- ✅ **Phase 4:** Presence & Polish (Cursors, UX improvements)

## License

MIT
