# Mnemos — Mémoire persistante et intelligence continue pour Claude

Plugin MCP qui donne à Claude une mémoire structurée, un rappel contextuel automatique et un "neurone" qui pense entre les sessions.

## Ce que fait Mnemos

**Mémoire structurée** : Extrait des atomes de mémoire typés (faits, décisions, positions, intentions, événements, contacts, contradictions, signaux, apprentissages, réflexions) depuis les conversations. Les range dans des espaces (projets, domaines) avec des embeddings vectoriels pour la recherche sémantique.

**Quick Boot** : Au premier message de chaque fil, charge automatiquement le contexte complet en un seul appel (profil, espaces actifs, atomes épinglés, dernier handover). Zero latence perçue.

**Rappel automatique** : `get_context` retrouve les atomes pertinents par similarité sémantique avec ce que l'utilisateur dit, même sans mention explicite. Supporte le cross-space et la working memory de session.

**Le neurone (cross_insights)** : Analyse les connexions entre espaces séparés. Un seul appel consolidé à Sonnet 4.6 qui voit toutes les paires cross-space simultanément et produit un diagnostic global : tensions, convergences, évolutions, synthèse profonde.

**Extraction continue** : Pendant la conversation, le LLM extrait automatiquement des atomes de mémoire via `log_exchange` (règle des 3 tours). La mémoire se remplit en temps réel. La déduplication à 2 paliers (skip si quasi-identique, fusion Haiku si similaire) empêche les doublons sur tous les chemins d'insertion.

**Multi-tenant** : Chaque utilisateur a son propre espace isolé sur Supabase. Un seul user_id suffit. Auth intégrée (login/signup/logout).

## Architecture

```
Plugin Mnemos (distribué)
├── .claude-plugin/plugin.json    # Identité du plugin
├── .mcp.json                     # Connexion MCP stdio → bundle
├── skills/mnemos/SKILL.md        # Instructions complètes pour le LLM
└── README.md                     # Ce fichier

Serveur MCP (installé séparément)
└── ~/mnemos-mcp/index.cjs        # 37 outils, fichier unique autonome CJS (~3.2 MB)

Infrastructure (hébergée par EvidencAI)
├── Supabase                      # Base de données, pgvector, auth
├── Edge Function                 # Fallback HTTP (Mode B)
└── pg_cron                       # Tâches automatiques (neurone, garbage collector)
```

## 37 outils MCP

| Catégorie | Outils |
|-----------|--------|
| Boot | quick_boot |
| Sessions | session_start, session_end |
| Auth | login, signup, logout, whoami |
| Espaces | list_spaces, create_space, update_space, suggest_spaces, analyze_space |
| Atomes | extract_atoms, create_atom_manual, update_atom, toggle_pin_atom, search_atoms, triage_atoms |
| Connexions | create_connection |
| Contexte | get_context (6 modes), get_stats, get_calibration |
| Mémoire | write_memory, read_memory |
| Profil | get_profile, update_profile |
| Contacts | upsert_contact, search_contacts |
| Ingestion | ingest_document, list_documents, ingest_events, process_events |
| Insights | cross_insights, log_exchange |
| Sync | sync_status |
| Maintenance | garbage_collect, health_check |
| Feedback | submit_feedback |

## Installation

### 1. Installer le plugin
Glisser-déposer le fichier `.plugin` (ou `.zip`) dans l'interface Claude Desktop (Réglages > Plugins).

### 2. Installer le serveur MCP
Copier `index.cjs` dans `~/mnemos-mcp/` :
```bash
mkdir -p ~/mnemos-mcp
cp index.cjs ~/mnemos-mcp/
```

### 3. Configurer Claude Desktop
Ajouter dans `~/Library/Application Support/Claude/claude_desktop_config.json` :
```json
{
  "mcpServers": {
    "mnemos": {
      "command": "node",
      "args": ["~/mnemos-mcp/index.cjs"],
      "env": {
        "SUPABASE_URL": "https://hpbsowihyydzdnxuzoxs.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "(fourni à l'inscription)",
        "ANTHROPIC_API_KEY": "(fourni à l'inscription)",
        "VOYAGE_API_KEY": "(fourni à l'inscription)",
        "MNEMOS_USER_ID": "VOTRE_USER_ID"
      }
    }
  }
}
```

### 4. Relancer Claude Desktop
Cmd+Q puis relancer. Les 37 outils Mnemos apparaissent dans tout nouveau fil.

### 5. Premier lancement
Ouvrir un nouveau fil Cowork et dire "ouvre un fil". Mnemos se charge automatiquement.

## Prérequis

- Claude Desktop (avec Cowork mode)
- Node.js 18+
- Un compte Mnemos (pour le MNEMOS_USER_ID et l'accès Supabase)

## Support

Dashboard : https://mnemos-dashboard.vercel.app
Contact : stephane.commenge@gmail.com

---
EvidencAI — Stéphane Commenge
