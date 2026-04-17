# 🏥 HCP CRM — AI-First Life Sciences CRM

> An AI-powered Customer Relationship Management system for field representatives in the life sciences industry, built for logging and managing Healthcare Professional (HCP) interactions.

---

## 🎯 Project Overview

This system provides field reps with two ways to log HCP interactions:

1. **Structured Form** — a clean, validated form with all required fields
2. **Conversational AI Chat** — describe the interaction in plain language; the AI extracts, structures, and stores it automatically

Both methods are powered by a **LangGraph agent** running on **Groq's llama-3.3-70b-versatile ** model for fast, high-quality extraction and reasoning.

---

## 🏗️ Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 18, Vite, Redux Toolkit, Tailwind CSS, Google Inter |
| Backend   | Python 3.11, FastAPI, SQLAlchemy async |
| AI Agent  | LangGraph, LangChain Core           |
| LLM       | Groq API — `gemma2-9b-it`           |
| Database  | PostgreSQL (via asyncpg)            |
| Container | Docker + Docker Compose             |

---

## 🤖 LangGraph Agent — 6 Tools

| # | Tool | Purpose |
|---|------|---------|
| 1 | `log_interaction_tool` | Extracts entities from free text using LLM → stores in DB |
| 2 | `edit_interaction_tool` | Modifies existing record via natural language instruction |
| 3 | `get_interaction_history_tool` | Fetches past interactions with filters + AI narrative |
| 4 | `suggest_next_action_tool` | Generates prioritised follow-up strategy for an HCP |
| 5 | `generate_summary_tool` | Produces weekly/monthly summary report |
| 6 | `search_hcp_tool` *(bonus)* | Searches HCPs by name/specialty with interaction counts |

### Agent Flow

```
User Message
    │
    ▼
classify_intent_node   ← Groq LLM decides which tool + args
    │
    ▼
execute_tool_node      ← Calls the appropriate tool (async)
    │
    ▼
format_response_node   ← Cleans up result for API response
    │
    ▼
Structured JSON Response → Frontend
```

---

## 📁 Project Structure

```
crm-hcp/
├── backend/
│   ├── agents/
│   │   └── hcp_agent.py        # LangGraph state graph + nodes
│   ├── tools/
│   │   └── hcp_tools.py        # All 6 LangChain tools
│   ├── models/
│   │   └── interaction.py      # SQLAlchemy ORM model
│   ├── database/
│   │   └── connection.py       # Async DB engine + session
│   ├── routes/
│   │   └── interactions.py     # FastAPI route handlers
│   ├── schemas/
│   │   └── interaction.py      # Pydantic request/response schemas
│   ├── main.py                 # FastAPI app + CORS + lifespan
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── form/
│   │   │   │   └── InteractionForm.jsx   # Structured form UI
│   │   │   ├── chat/
│   │   │   │   └── ChatInterface.jsx     # AI chat panel
│   │   │   ├── dashboard/
│   │   │   │   ├── StatCard.jsx
│   │   │   │   ├── RecentInteractions.jsx
│   │   │   │   └── InteractionTable.jsx
│   │   │   └── ui/
│   │   │       ├── Layout.jsx
│   │   │       ├── Sidebar.jsx
│   │   │       └── Toast.jsx
│   │   ├── pages/
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── LogInteractionPage.jsx
│   │   │   └── HistoryPage.jsx
│   │   ├── redux/
│   │   │   ├── store.js
│   │   │   └── slices/
│   │   │       ├── interactionsSlice.js
│   │   │       ├── chatSlice.js
│   │   │       └── uiSlice.js
│   │   ├── services/
│   │   │   └── api.js          # Axios instance with interceptors
│   │   └── styles/
│   │       └── globals.css     # Tailwind + glassmorphism styles
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml
└── README.md
```

---

## ⚡ Quick Start

### Option A — Docker (Recommended)

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd crm-hcp

# 2. Set your Groq API key
echo "GROQ_API_KEY=your_key_here" > .env

# 3. Start everything
docker-compose up --build

# Frontend → http://localhost:5173
# Backend  → http://localhost:8000
# API Docs → http://localhost:8000/docs
```

### Option B — Manual Setup

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and fill env file
cp .env.example .env
# Edit .env — add your GROQ_API_KEY and DATABASE_URL

# Start PostgreSQL (if not using Docker)
# Ensure you have a database named: crm_hcp

# Run the API
uvicorn main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy env file
cp .env.example .env

# Start dev server
npm run dev
# → http://localhost:5173
```

---

## 🔑 Environment Variables

### Backend `.env`

```env
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/crm_hcp
GROQ_API_KEY=your_groq_api_key_here
FRONTEND_URL=http://localhost:5173
APP_ENV=development
```

Get your Groq API key at: https://console.groq.com/keys

### Frontend `.env`

```env
VITE_API_URL=http://localhost:8000/api
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/interactions/form` | Log via structured form |
| `POST` | `/api/interactions/chat` | Log/query via AI chat |
| `GET`  | `/api/interactions` | List all (paginated + filtered) |
| `GET`  | `/api/interactions/{id}` | Get single interaction |
| `PUT`  | `/api/interactions/{id}` | Update interaction |
| `DELETE` | `/api/interactions/{id}` | Delete interaction |
| `GET`  | `/api/stats` | Dashboard statistics |
| `POST` | `/api/agent/chat` | Direct agent endpoint |
| `GET`  | `/health` | Health check |

Full interactive docs at: `http://localhost:8000/docs`

---

## 💬 Example AI Chat Commands

```
# Log a new interaction
"Met Dr. Priya Sharma today at Apollo Hospital, discussed Jardiance for Type 2 diabetes,
 she was positive and asked for clinical data. Follow up next Tuesday."

# Get history
"Show me my last 10 interactions"

# Get history for specific HCP
"Show all interactions with Dr. Patel from the last month"

# Edit an interaction
"Edit interaction <uuid> — change sentiment to Positive and add follow-up on May 5th"

# Get next action advice
"What should I do next with Dr. Mehta from Fortis?"

# Generate report
"Give me a weekly summary"

# Search HCPs
"Find all cardiologists I've met"
```

---

## 🗄️ Database Schema

```sql
CREATE TABLE hcp_interactions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hcp_name            VARCHAR(255) NOT NULL,
    specialty           VARCHAR(255),
    hospital            VARCHAR(500),
    interaction_type    interaction_type_enum NOT NULL DEFAULT 'Visit',
    interaction_date    DATE,
    summary             TEXT,
    topics_discussed    TEXT,
    products_discussed  TEXT,
    materials_shared    TEXT,
    sentiment           sentiment_type_enum DEFAULT 'Neutral',
    follow_up_required  BOOLEAN DEFAULT FALSE,
    follow_up_date      DATE,
    follow_up_notes     TEXT,
    outcomes            TEXT,
    ai_suggested_actions TEXT,
    log_source          VARCHAR(50) DEFAULT 'form',
    raw_chat_input      TEXT,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP
);
```

---

## 🎨 UI Features

- **Glassmorphism design** with soft green accent palette
- **Mesh gradient background** — not the generic navy/dark look
- **Split-panel layout** — form and chat side by side
- **Real-time toast notifications**
- **Animated transitions** — fade-in, slide-up, typing indicator
- **Expandable history rows** with full interaction details
- **Responsive** — works on all screen sizes
- **Quick prompt chips** in chat to help new users

---

## 🧠 Architecture Decisions

- **LangGraph over bare LangChain** — gives us a proper state machine for agent reasoning; easy to add multi-turn memory later
- **Async everywhere** — FastAPI + SQLAlchemy async + httpx async = no blocking calls
- **Tool-per-concern** — each LangGraph tool has a single responsibility, making the agent easy to debug and extend
- **Optimistic UI** — user messages appear immediately in chat before the agent responds
- **Schema separation** — Pydantic schemas are separate from ORM models to avoid tight coupling

---

## 📝 License

MIT — built for internship evaluation purposes.
