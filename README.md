# Mnemos — Persistent Intelligent Memory for Claude

Mnemos gives Claude a persistent, contextual memory across conversations. It stores decisions, learnings, reflections, facts, and more as structured **atoms** in a knowledge graph.

## Features

- **33 MCP tools** — sessions, atoms, spaces, profiles, documents, contacts, insights
- **10 atom types** — decision, position, fact, contradiction, learning, signal, reflection, intention, event, contact
- **Smart decay** — each atom type has its own half-life, keeping memory fresh and relevant
- **Cross-insights** — automatic detection of tensions, patterns, and connections across spaces
- **Dashboard** — visual exploration of your knowledge graph at [mnemos-dashboard.vercel.app](https://mnemos-dashboard.vercel.app)

## Installation

### From Claude Marketplace

```
/plugin install mnemos-plugin
```

### From GitHub

```
/plugin install stephanecomm/mnemos-plugin
```

## Setup

1. Create your account at [mnemos-dashboard.vercel.app](https://mnemos-dashboard.vercel.app)
2. Get your API key from the dashboard
3. Configure your environment variables:

```
MNEMOS_API_KEY=your_api_key_here
MNEMOS_USER_ID=your_user_id
```

## Quick Start

Once installed, Mnemos activates automatically. Just talk to Claude naturally:

- **"codex in [project]"** — open a project session
- **"remember that..."** — store a decision, fact, or learning
- **"search for..."** — recall from memory
- **"brief me"** — morning briefing with calendar + insights
- **"codex out"** — close session with full handover

## Architecture

Mnemos runs as a local MCP server connecting to a hosted backend:

```
Claude ←→ MCP Server (local) ←→ Supabase (hosted)
                                    ├── pgvector embeddings
                                    ├── Voyage AI (voyage-3-lite)
                                    └── Haiku extraction
```

## Built by

**EvidencAI** — Stéphane Commenge
[mnemos-dashboard.vercel.app](https://mnemos-dashboard.vercel.app)

## License

Proprietary — All rights reserved.
