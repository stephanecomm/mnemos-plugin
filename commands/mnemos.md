---
description: Start Mnemos — persistent memory for Claude
allowed-tools: ["mcp__mnemos__mnemos_quick_boot", "mcp__mnemos__mnemos_session_start", "mcp__mnemos__mnemos_get_profile", "mcp__mnemos__mnemos_get_stats", "mcp__mnemos__mnemos_list_spaces", "mcp__mnemos__mnemos_read_memory", "mcp__mnemos__mnemos_search_atoms", "mcp__mnemos__mnemos_login", "mcp__mnemos__mnemos_signup", "Read"]
argument-hint: [espace] ou "help"
---

# Commande /mnemos

Initialise Mnemos, la mémoire persistante de Claude.

## Flux de décision

### 1. Vérifier la connexion

Appeler `mnemos_quick_boot(userId:"default")`.

Si quick_boot retourne une erreur d'authentification ou "no credentials" :
- Afficher ce message d'accueil :

```
Mnemos — Mémoire intelligente pour Claude

Mnemos donne à Claude une mémoire persistante entre vos conversations :
décisions, apprentissages, contacts, faits, réflexions...

Pour commencer, connectez-vous ou créez votre compte.
Tapez : /mnemos login   ou   /mnemos signup

Dashboard : https://mnemos-dashboard.vercel.app
```

- STOP. Ne pas aller plus loin.

### 2. Utilisateur connecté — traiter les arguments

Si `$ARGUMENTS` est vide ou absent :
- Exécuter le protocole d'ouverture complet décrit dans le skill SKILL.md (quick_boot, session_start, affichage du bloc d'accueil avec espaces, commandes, lien Dashboard).
- Demander "Sur quel espace on travaille ?"

Si `$ARGUMENTS` = "help" :
- Lire le fichier `${CLAUDE_PLUGIN_ROOT}/skills/mnemos/SKILL.md`
- Afficher la table "Commandes en langage naturel" reformatée en blocs thématiques.

Si `$ARGUMENTS` = "login" :
- Demander email et mot de passe à l'utilisateur
- Appeler `mnemos_login(email, password)`
- Si succès : stocker les credentials, afficher "Connecté ! Tapez /mnemos pour démarrer."
- Si échec : afficher l'erreur et proposer /mnemos signup

Si `$ARGUMENTS` = "signup" :
- Demander email et mot de passe souhaité à l'utilisateur
- Appeler `mnemos_signup(email, password)`
- Si succès : afficher "Compte créé ! Tapez /mnemos pour démarrer."
- Si échec : afficher l'erreur

Si `$ARGUMENTS` = un nom d'espace (ex: "Développement Mnemos", "CodirIA") :
- Exécuter quick_boot + session_start(spaceId: $ARGUMENTS)
- Charger read_memory(spaceId, type:"all")
- Afficher le contexte et demander confirmation

Si `$ARGUMENTS` = "out" ou "fin" :
- Exécuter le protocole de clôture décrit dans SKILL.md (workSummary, session_end, write_memory codex, vérification).

Si `$ARGUMENTS` = "stats" :
- Appeler mnemos_get_stats et afficher les compteurs.

### 3. Toujours afficher le lien Dashboard

Chaque réponse de /mnemos DOIT inclure en fin de message :
```
Dashboard : https://mnemos-dashboard.vercel.app
```