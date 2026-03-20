# Mnemos — Mode B : Contournement HTTP via Desktop Commander

Ce fichier est la référence complète du Mode B (fallback quand les outils MCP natifs ne sont pas disponibles).

## Détection

Vérifier si `mnemos_session_start` existe dans les outils disponibles. Si non → Mode B.

## Bootstrap (obligatoire avant tout appel)

### Étape B1 — Lire SUPABASE_SERVICE_ROLE_KEY

```
mcp__Desktop_Commander__start_process(
  command: 'python3 -c "import json; c=json.load(open(\"/Users/$USER/Library/Application Support/Claude/claude_desktop_config.json\")); print(c[\"mcpServers\"][\"mnemos\"][\"env\"][\"SUPABASE_SERVICE_ROLE_KEY\"])"',
  timeout_ms: 5000
)
```

Note : `$USER` est résolu par le shell macOS côté Desktop Commander (pas par la VM Cowork).

### Étape B2 — Récupérer EDGE_FUNCTION_TOKEN

```
curl -s "https://SUPABASE_PROJECT_REF.supabase.co/rest/v1/secrets?project=eq.Mnemos&service=eq.edge_function&key_name=eq.bearer_token&select=key_value" \
  -H "apikey: [valeur B1]" -H "Authorization: Bearer [valeur B1]"
```

### Étape B3 — Template curl pour tous les appels

```
mcp__Desktop_Commander__start_process(
  command: 'curl -s -X POST "https://SUPABASE_PROJECT_REF.supabase.co/functions/v1/mnemos-mcp" -H "Content-Type: application/json" -H "Authorization: Bearer [token B2]" -d \'{"jsonrpc":"2.0","method":"tools/call","params":{"name":"TOOL_NAME","arguments":{"userId":"USER_UUID",...}},"id":1}\'',
  timeout_ms: 30000
)
```

Parsing : JSON-RPC → `result.content[0].text`. Timeout : 30s standard, 60s pour cross_insights/extract_atoms.

## Fallback REST direct (si Edge Function en panne)

Si l'Edge Function retourne 401 ou timeout, utiliser directement l'API REST Supabase avec la SERVICE_ROLE_KEY :

```
curl -s "https://SUPABASE_PROJECT_REF.supabase.co/rest/v1/TABLE?FILTERS" \
  -H "apikey: [SERVICE_ROLE_KEY]" -H "Authorization: Bearer [SERVICE_ROLE_KEY]"
```

Tables utiles : spaces, memory_atoms, handovers, user_profiles, task_queue.

## Clôture Mode B — BUG CONNU

L'Edge Function `write_memory` ne remplit pas `summary` (NOT NULL). Contournement :

```
curl -s -X POST "https://SUPABASE_PROJECT_REF.supabase.co/rest/v1/handovers" \
  -H "apikey: [SUPABASE_SERVICE_ROLE_KEY]" -H "Authorization: Bearer [SUPABASE_SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"user_id":"USER_UUID","space_id":"SPACE_UUID","summary":"VERSION_COURTE","content":"VERSION_LONGUE","session_id":"SESSION_ID"}'
```

Note : `session_id` provient du `session_start` précédent. Si non disponible, générer un UUID v4 : `python3 -c "import uuid; print(uuid.uuid4())"`.

## Exemples concrets

### initialize (test de connexion)

```
curl -s -X POST "https://SUPABASE_PROJECT_REF.supabase.co/functions/v1/mnemos-mcp" -H "Content-Type: application/json" -H "Authorization: Bearer [token B2]" -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"cowork","version":"1.0"}},"id":1}'
```

### mnemos_session_start

```
curl -s -X POST "https://SUPABASE_PROJECT_REF.supabase.co/functions/v1/mnemos-mcp" -H "Content-Type: application/json" -H "Authorization: Bearer [token B2]" -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"mnemos_session_start","arguments":{"userId":"USER_UUID"}},"id":1}'
```
