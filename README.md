# MyStudyPlanner Monorepo

Application de planification de révisions pour étudiants en médecine.

## Structure du Monorepo

```
/app
├── apps/
│   ├── mobile/         # Application Expo (iOS, Android, Web)
│   └── desktop/        # Application Tauri (macOS, Windows, Linux)
├── packages/
│   ├── shared-ui/      # Composants React Native partagés
│   └── api-client/     # Client API, stores Zustand, types
└── backend/            # Serveur FastAPI + MongoDB
```

## Démarrage rapide

### Application Mobile (Expo)

```bash
# Depuis la racine
npm run mobile

# Ou directement
cd apps/mobile
npm start
```

### Application Desktop (Tauri)

```bash
# Depuis la racine
npm run desktop

# Ou directement
cd apps/desktop
npm run tauri:dev
```

### Backend

```bash
cd backend
python -m uvicorn server:app --reload --port 8001
```

## Scripts disponibles

- `npm run mobile` - Lance l'application mobile Expo
- `npm run desktop` - Lance l'application desktop Tauri en mode dev
- `npm run desktop:build` - Build l'application desktop

## Technologies

- **Frontend Mobile**: Expo, React Native, TypeScript, Zustand
- **Frontend Desktop**: Tauri, Rust
- **Backend**: FastAPI, MongoDB, Python
- **Authentification**: JWT

## Packages partagés

### @mystudyplanner/api-client

Contient:
- Client API axios configuré
- Stores Zustand (auth, sessions, catalog, etc.)
- Types TypeScript

### @mystudyplanner/shared-ui

Contient:
- Composants React Native réutilisables
- Thème et styles partagés
