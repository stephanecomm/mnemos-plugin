---
name: mnemos
description: >
  Mémoire contextuelle et réflexive pour Claude. Graphe de connaissances avec
  atomes (10 types), espaces (projets), profil utilisateur et neurone cross-insights.
  Déclencher pour : ouverture/clôture de fil, "codex in/out", "souviens-toi",
  "cherche dans ma mémoire", "mes espaces", "retiens que", "brief matinal",
  "analyse les tensions", ou toute référence à la mémoire persistante.
---

# Mnemos — Mémoire contextuelle et réflexive

Graphe de connaissances : **atomes** (10 types), **espaces** (projets), **profil** (principes + portrait), **neurone** (cross-insights).

## QUICK REFERENCE (survit à la compaction)

| Config | Valeur |
|--------|--------|
| Supabase Mnemos | hpbsowihyydzdnxuzoxs |
| Dashboard | https://mnemos-dashboard.vercel.app |
| Mode A | Outils MCP natifs mnemos_* (préféré) |
| Mode B | Desktop Commander + curl Edge Function (fallback) |

POST-COMPACTION : Après toute compression de contexte :
1. Appeler `mnemos_quick_boot(userId:USER_ALIAS)` pour le contexte rapide
2. RELIRE ce skill en entier
3. Résumer ce qui a été retrouvé et demander confirmation à l'utilisateur
NE JAMAIS continuer en se fiant uniquement au résumé compressé.
Si quick_boot indisponible → fallback sur `mnemos_get_profile(userId:USER_ALIAS)`.

USERID : Mode A (outils MCP) → userId:USER_ALIAS. Mode B (curl Edge Function) → userId:USER_UUID.

---

## REPRISE POST-COMPRESSION (continuation de session)

**Trigger** : le message système contient "continued from a previous conversation", "context compaction", un résumé de session précédente, ou l'instruction "Continue the conversation from where it left off".

**CE SCÉNARIO EST CRITIQUE** : le LLM a perdu ~70% du contexte détaillé. Le résumé compressé contient des références à des fichiers, décisions et tâches en cours, mais sans la précision nécessaire pour continuer proprement. Sans ce protocole, la session reprend SANS mémoire Mnemos, et aucun atome ne sera capturé.

### PROTOCOLE OBLIGATOIRE (AVANT de continuer le travail) :

1. **Détecter l'espace actif** dans le résumé compressé (nom de projet, fichiers mentionnés, espace Mnemos référencé)
2. **Appeler** `mnemos_session_start(userId:USER_ALIAS, sessionId:"resume-YYYY-MM-DD", spaceId:"[espace détecté]")`
3. **Appeler** `mnemos_read_memory(userId:USER_ALIAS, spaceId:"[espace]", type:"all")` pour recharger codex + handovers
4. **Croiser** le résumé compressé avec la mémoire Mnemos : vérifier que les décisions et l'état mentionnés dans le résumé sont cohérents avec le codex
5. **Résumer** à l'utilisateur : "Je reprends après compression. Voici ce que j'ai retrouvé : [résumé croisé]. On continue ?"
6. **Réactiver le compteur log_exchange** (remis à 0)

### CAS PARTICULIERS :

- Si l'espace n'est pas identifiable dans le résumé → appeler `mnemos_list_spaces` puis demander à l'utilisateur
- Si le résumé dit "Continue directly" ou "do not recap" → faire le `session_start` QUAND MÊME, mais enchaîner directement sur le travail sans attendre confirmation. La mémoire est **non négociable**, même si le résumé demande de ne pas récapituler.
- Si plusieurs espaces sont mentionnés dans le résumé → choisir celui qui correspond à la tâche en cours, mentionner les autres

### CE QUI SE PASSE SI LE LLM IGNORE CE PROTOCOLE :
- Pas de session_start → pas de compteur log_exchange → pas d'extraction automatique → session entière perdue
- Le codex ne sera pas mis à jour en fin de fil
- Les décisions prises après compression ne seront jamais mémorisées
- C'est exactement le bug constaté le 21/03/2026 : session complète de dev dashboard sans aucun atome capturé

---

## PROTOCOLE D'OUVERTURE (obligatoire)

À chaque ouverture de fil (trigger : "ouvre un fil", "codex in", "session start", "lance Mnemos", ou appel implicite du skill), suivre ce protocole en 6 étapes. NE PAS sauter d'étape.

### Étape 0 : Quick Boot (AUTOMATIQUE)
**Cet appel est OBLIGATOIRE et AUTOMATIQUE au tout premier message de chaque fil, AVANT toute autre action.**
Appeler `mnemos_quick_boot(userId:USER_ALIAS)`.
Retourne en un seul appel : profil, espaces actifs (top 5), atomes épinglés (top 8), dernier handover, mémoire transversale.
Si quick_boot n'est pas disponible → fallback sur `mnemos_get_profile(userId:USER_ALIAS)`.
Quick_boot ne crée PAS de session. Il charge le contexte minimum pour que Claude soit opérationnel immédiatement.

### Étape 1 : Chargement initial
1. Vérifier l'heure via Desktop Commander (`date`) pour la salutation
2. Appeler `mnemos_session_start` (sans spaceId) pour le contexte transversal
3. Appeler `mnemos_get_stats` pour les compteurs réels (total atomes, connections, espaces)
4. NE PAS compter les atomes manuellement. Utiliser les champs `total`, `connections`, `spaces` retournés par get_stats.

### Étape 2 : Catch-up des tâches planifiées
`session_start` retourne les tâches pending de `task_queue` dans sa sortie formatée :
```
Tâches en attente (2):
  - [morning-brief] due: 16/03/2026
  - [mail-collect] due: 16/03/2026
```
Si des tâches apparaissent : les exécuter (voir section "Tâches planifiées").
Si absent ou vide : passer à l'étape 3.

### Étapes 3-5 : Accueil → Chargement → Validation

Présenter SYSTÉMATIQUEMENT ce bloc d'accueil :

```
---
Mnemos — [Salutation selon l'heure]

Espaces actifs :
  [Espace 1] — [JJ/MM] · [N1] atomes
  [Espace 2] — [JJ/MM] · [N2] atomes

Commandes : "ouvre [espace]" · "brief matinal" · "cherche [sujet]" · "fin de fil"
[Si tâches rattrapées] Rattrapage : [résumé court]

Dashboard : https://mnemos-dashboard.vercel.app
---
Sur quel espace on travaille ?
```

Le lien Dashboard DOIT apparaître systématiquement à chaque ouverture de fil.
Premier lancement (mémoire vide) : proposer "crée dossier [nom]".
Espace déjà mentionné ("codex in X") : charger directement.

**Chargement** : `read_memory(spaceId, type:"all")` → afficher codex (2-3 lignes) + dernières sessions (date + 1 ligne). "C'est bien là qu'on en était ?"
**Validation** : confirmation → démarrer. Correction → investiguer (search_atoms, get_context).
**Résolution nom** : `list_spaces` + matching souple insensible à la casse. Ambiguïté → demander. Exception : "evidencai" = "CodirIA".

---

## PROTOCOLE DE CLÔTURE

Triggers : "fin de fil" / "mémorise" / "on ferme" / "session end" / "codex out"

1. **Rédiger le workSummary** (600-800 mots) : résumé narratif exhaustif.
   Inclure : décisions (avec contexte), problèmes résolus (comment), travail produit, limitations, prochaines étapes, questions ouvertes.

2. **Sauvegarder le handover** :
   Mode A : `mnemos_session_end(userId:USER_ALIAS, workSummary:...)`
   Mode B : voir Annexe B (contournement REST API).

3. **Mettre à jour le codex** (SYSTÉMATIQUEMENT) :
   Lire : `mnemos_read_memory(userId:USER_ALIAS, spaceId:"[nom]", type:"codex")`
   Rédiger (800-1200 mots) : document COMPLET, pas un append. Réécriture totale.
   Structure : État actuel / Architecture et choix techniques / Décisions actives / Limitations / Prochaines étapes
   Écrire : `mnemos_write_memory(userId:USER_ALIAS, spaceId:"[nom]", type:"codex", content:...)`

4. **Vérifier** handover + codex réussis (sinon voir Annexe F : Gestion des erreurs).

5. **Confirmer** : "Session clôturée. Handover (XXX mots) et codex mis à jour pour [espace]."

---

## COMPORTEMENT AUTOMATIQUE DU LLM

### log_exchange — RÈGLE DES 3 TOURS (RENFORCÉE 21/03/2026)

**POURQUOI C'EST LA RÈGLE LA PLUS IMPORTANTE DE CE SKILL :**
Sans log_exchange, le buffer reste vide, l'extraction ne se déclenche JAMAIS, la mémoire ne se remplit pas.
log_exchange est le SEUL point d'entrée de toute la chaîne : log_exchange → buffer (3 échanges ou 4000 chars) → extractAtomsFromBuffer (Haiku, fire-and-forget) → atomes créés en base.
Si le LLM n'appelle pas log_exchange, RIEN ne se passe. Zéro. Constaté le 16/03 et le 21/03/2026.

**MÉCANISME DE COMPTEUR (obligatoire) :**
Le LLM DOIT maintenir un compteur mental de messages utilisateur depuis le dernier log_exchange.
- Message utilisateur reçu → compteur += 1
- Si compteur >= 3 → APPELER log_exchange IMMÉDIATEMENT, AVANT de rédiger la réponse, puis remettre à 0
- Si la réponse dépasse 400 mots → APPELER log_exchange EN FIN de réponse, remettre à 0
- Après tout appel à un outil mnemos_* → piggyback un log_exchange, remettre à 0

**PRÉ-CHECK OBLIGATOIRE (avant chaque réponse) :**
Avant de commencer à rédiger une réponse, le LLM DOIT se poser cette question :
"Combien de messages utilisateur depuis mon dernier log_exchange ?"
Si la réponse est >= 3, ou si la réponse est "je ne sais pas" : appeler log_exchange d'abord.

**FORMAT :**
```
mnemos_log_exchange(userId:"stephane", sessionId:"cowork-YYYY-MM-DD", spaceId:"[espace actif]", userMessage:"[résumé 1-2 phrases]", assistantResponse:"[résumé 1-2 phrases]")
```
Note : sessionId est OBLIGATOIRE. Si pas de session formelle, utiliser "cowork-YYYY-MM-DD".
Le serveur bufferise : 3 échanges OU 4000 chars → extractAtomsFromBuffer auto (Haiku, fire-and-forget). TTL buffer 30 min.

**DÉCLENCHEURS OBLIGATOIRES (résumé) :**
1. Compteur >= 3 messages utilisateur
2. Réponse > 400 mots
3. Après tout appel mnemos_* (piggyback)
4. Après toute décision, problème résolu, changement de direction
5. Après un échange émotionnel ou feedback utilisateur

**CE QUI SE PASSE SI LE LLM OUBLIE :**
- Le buffer reste à 0
- extractAtomsFromBuffer ne se déclenche jamais
- Aucun atome n'est créé automatiquement
- La session entière est perdue pour la mémoire
- C'est comme si la conversation n'avait jamais eu lieu

**ANTI-PATTERN IDENTIFIÉ :**
Le LLM lit cette instruction, comprend qu'il "devrait" appeler log_exchange, puis l'oublie dès qu'il se concentre sur la tâche en cours. C'est le comportement par défaut. Le compteur et le pré-check sont des garde-fous contre ce biais.

### Création proactive d'atomes

Si l'utilisateur exprime quelque chose correspondant à un type d'atome (décision, leçon, contradiction...), le LLM DOIT créer l'atome via `create_atom_manual` et informer : "Je retiens ça comme [type]."
DOIT, pas PEUT. "PEUT" = "ne le fait pas".
L'utilisateur peut corriger le type ou demander de ne pas retenir.

### extract_atoms (sur demande)

L'utilisateur dit "extrais les atomes". Extraction immédiate sans attendre le buffer.

### Hygiène mémoire
- `triage_atoms` : quand get_stats montre > 30% d'atomes basse confiance, ou sur demande.
- `garbage_collect` : tâche hebdomadaire (pg_cron dimanche 2h UTC). Archive atomes sous le seuil de decay, détecte doublons.
- `health_check` : cron quotidien (pg_cron 5h UTC via Edge Function health-cron). Génère les embeddings manquants, reconnecte les orphelins, purge les connexions obsolètes. Aussi appelable manuellement : `mnemos_health_check(userId, repair:true)`.
- **Déduplication automatique (v0.4.0)** : tous les chemins d'insertion d'atomes (extract_atoms, create_atom_manual, ingest_document, extractAtomsFromBuffer) vérifient les doublons AVANT insertion via vector_score (cosine pure). Deux paliers : >= 0.90 skip (garder le plus long), 0.80-0.90 fusion Haiku. Transparent pour l'utilisateur.

---

## COMMANDES EN LANGAGE NATUREL

| L'utilisateur dit | Action Mnemos |
|-------------------|---------------|
| (automatique au 1er message) | quick_boot (contexte rapide) |
| codex in X, charge X, ouvre un fil | session_start + read_memory(spaceId:X) |
| codex out, fin de fil, sauvegarde | session_end + write_memory |
| retiens que... | create_atom_manual (type selon heuristique, voir Annexe C) |
| décision : ... | create_atom_manual(type:"decision") |
| fait : ..., info : ... | create_atom_manual(type:"fact") |
| j'ai appris, learning: | create_atom_manual(type:"apprentissage") |
| je me demande, question ouverte | create_atom_manual(type:"reflexion") |
| je prévois de, prochaine étape: | create_atom_manual(type:"intention") |
| signal:, feedback:, on m'a dit que | create_atom_manual(type:"signal_externe") |
| rendez-vous le..., événement: | create_atom_manual(type:"event") |
| contact:, qui est X (pour créer) | upsert_contact |
| contradiction entre..., tension: | create_atom_manual(type:"contradiction") |
| épingle | toggle_pin_atom |
| cherche Y, dans ma mémoire | search_atoms(query:Y) |
| mes espaces, mes dossiers | list_spaces |
| crée dossier X | create_space(name:X) |
| analyse les tensions | cross_insights |
| analyse l'espace X | analyze_space(spaceId:X) |
| qui est X (pour chercher) | search_contacts(query:X) |
| brief matinal | gcal_list_events (aujourd'hui) + get_context(mode:"morning") |
| stats, état mémoire | get_stats |
| mon profil, portrait, qui suis-je | get_profile |
| montre le codex de X | read_memory(spaceId:X, type:"codex") |
| montre les handovers | read_memory(spaceId:X, type:"all") |
| injecte ce document | ingest_document |
| nettoie ma mémoire, trie les atomes | triage_atoms |
| lance le garbage collector | garbage_collect |
| diagnostic mémoire, santé | health_check |
| mnemos help, codex help | afficher l'aide ci-dessous |

---

## TÂCHES PLANIFIÉES

Deux systèmes complémentaires :
- **Supabase `task_queue` + pg_cron** (serveur, 24/7, ordi éteint OK)
- **Cowork `scheduled-tasks`** (client, exécution quand Cowork ouvert)

`session_start` retourne automatiquement les tâches pending (v13+).

| task_name | Action |
|-----------|--------|
| `morning-brief` | `gcal_list_events` (aujourd'hui) + `get_context(mode:"morning")` → rédiger le brief |
| `mail-collect` | `gmail_search_messages` → `mnemos_ingest_events` + `mnemos_process_events` |
| `weekly-insights` | `cross_insights` + `analyze_space` sur tous les espaces actifs |
| `garbage-collect` | `mnemos_garbage_collect` : archivage, dédoublonnage |
| `health-check` | Edge Function `health-cron` : embeddings, orphelins, connexions obsolètes (pg_cron 5h UTC) |

Marquer une tâche "done" : voir Annexe E (PATCH REST API via Desktop Commander).
En Mode A sans Desktop Commander : ne pas marquer (restera pending, vérifier doublons).
Si aucune tâche pending : ne rien mentionner.

---

## AIDE (mnemos help / codex help)

Quand l'utilisateur demande l'aide, afficher la table "Commandes en langage naturel" ci-dessus, reformatée en blocs thématiques (Ouverture, Clôture, Mémoire, Espaces, Intelligence, Hygiène, Profil, Stats).

---

# ANNEXES (référence — consulter à la demande)

## Annexe A : Configuration par utilisateur

Mnemos est multi-utilisateur. Chaque installation nécessite ces valeurs :

| Variable | Source | Exemple (Stéphane) |
|----------|--------|---------------------|
| USER_ALIAS | userId pour les outils MCP Mode A | "stephane" |
| USER_UUID | userId pour les curls Mode B | 2ba47612-aa7d-45ef-b9a9-295d039e5f82 |
| SUPABASE_PROJECT_REF | Référence projet Supabase | hpbsowihyydzdnxuzoxs |
| SUPABASE_SERVICE_ROLE_KEY | Env var dans claude_desktop_config.json | (ne pas écrire ici) |
| EDGE_FUNCTION_TOKEN | Table `secrets` de Mnemos | (ne pas écrire ici) |

**Où trouver ces valeurs :**
- claude_desktop_config.json → section mcpServers.mnemos.env
- Table `secrets` Supabase → credentials supplémentaires
- `mnemos_get_profile(userId:USER_ALIAS)` → principes, portrait, instructions

**Premier setup :**
1. Déployer Mnemos Supabase (migrations SQL)
2. Configurer le MCP server dans claude_desktop_config.json
3. Créer le profil : `mnemos_update_profile(userId:USER_ALIAS, ...)`
4. Peupler la table `secrets` avec les credentials

## Annexe B : Modes de connexion

**Mode A** (préféré) : outils MCP natifs `mnemos_*` → les utiliser directement.
**Mode B** (fallback) : si aucun outil `mnemos_*` disponible → curl via Desktop Commander.
Détection : vérifier si `mnemos_session_start` existe dans les outils. Si non → Mode B.
Procédure complète Mode B : voir `FALLBACK-MODE-B.md` dans le même dossier que ce skill.

## Annexe C : 10 types d'atomes (référence + heuristique de typage)

| Type | Decay | Déclencheurs typiques |
|------|-------|----------------------|
| decision | 180j | "on part sur X", "décidé que" |
| position | 180j | "je pense que", "notre position est" |
| fact | 90j | fait vérifiable, info technique, "le serveur est en v3.2" |
| contradiction | 90j | "d'un côté... de l'autre", tension |
| apprentissage | 90j | "j'ai appris que", "erreur: ne plus faire X" |
| signal_externe | 60j | feedback, article, donnée marché, "on m'a dit que" |
| reflexion | 60j | "je me demande si", question ouverte, pattern |
| intention | 30j | "je vais", "prochaine étape" |
| event | 30j | événement daté, "hier", "le 15 mars" |
| contact | 365j | personne, relation, "Jean-Marc est le DG" |

Ne PAS mapper mécaniquement. Analyser le contenu. En cas de doute, préférer le type avec la demi-vie la plus longue. Si ambigu, demander."

## Annexe D : Référence rapide

**37 outils MCP** : Auth (login, signup, logout, whoami) · Espaces (list, suggest, create, update) · Atomes (search, create_manual, update, toggle_pin, triage, extract, garbage_collect) · Contexte (get_context, get_stats, get_calibration) · Boot (quick_boot) · Sessions (session_start, session_end) · Mémoire (write_memory, read_memory) · Profil (get_profile, update_profile) · Contacts (upsert, search) · Ingestion (ingest_document, ingest_events, process_events) · Insights (cross_insights, analyze_space) · Documents (list_documents) · Connexions (create_connection) · Feedback (submit_feedback, log_exchange) · Sync (sync_status) · Maintenance (health_check)
Note spaceId : Mode A accepte le **nom**. Mode B exige le **UUID**.

**get_context — 6 modes** : auto (défaut), onboard (25 atomes, ouverture), recall (8 atomes, ponctuel), briefing (15 atomes, projet), morning (insights complets), explore (20 atomes, brainstorm).

**Profil** : get_profile / update_profile. Source de vérité unique (pas de PRINCIPES.md).

**Marquer tâche "done"** : PATCH REST `task_queue?id=eq.TASK_ID` avec `{"status":"done","executed_at":"now()"}`. Cowork : `list/create/update_scheduled_tasks`.

## Annexe F : Gestion des erreurs

1. Mode A échoue → retenter une fois. Échec persistant → basculer Mode B.
2. Mode B échoue → "L'accès mémoire est indisponible. Je continue sans, session non sauvegardée."
3. Ni A ni B → travailler sans mémoire, le signaler clairement.
4. Ne JAMAIS ignorer un échec d'écriture (handover, codex, atome). Toujours prévenir.
5. Clôture échouée → copier handover/codex dans le chat pour sauvegarde manuelle.



## Annexe I : Architecture technique

Trois couches de code, une seule base Supabase :
- Source (vérité) : ~/Claude-Dev/Mnemos MCP SERVER old/mcp-server/src/ (33 outils, TypeScript)
- Dist (compilation tsc) : ~/Claude-Dev/Mnemos MCP SERVER old/mcp-server/dist/index.js
- Bundle (compilation esbuild --format=cjs, ACTIF) : ~/Claude-Dev/Mnemos MCP SERVER old/mcp-server/bundle/index.cjs (fichier unique autonome, 3.1 MB)
- Config : ~/Library/Application Support/Claude/claude_desktop_config.json (pointe vers bundle)
- Dashboard : déployé sur Vercel (code source local variable)
- Supabase : pgvector, Voyage AI voyage-3-lite 512 dim, Haiku extraction
- Edge Function : https://SUPABASE_PROJECT_REF.supabase.co/functions/v1/mnemos-mcp
- Table secrets : coffre-fort credentials, RLS service_role only
- Plugin Cowork : compressé manuellement, READ-ONLY dans .local-plugins/

## Annexe K : Ton

Mnemos est le nom de l'application, l'utiliser librement.
Dans les échanges courants, dire "je me souviens que..." ou "dans le dossier X..." plutôt que détailler la mécanique.
Ne pas mentionner les modes (A/B), les outils MCP ou les fichiers mémoire sauf demande explicite ou debug.
