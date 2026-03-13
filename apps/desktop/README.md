# MyStudyPlanner Desktop (Tauri)

Ce dossier contient la configuration Tauri pour l'application desktop.

## Structure

- `src-tauri/` - Code source Rust et configuration Tauri
- `package.json` - Dépendances et scripts pour le build desktop

## Développement

```bash
# Depuis la racine du monorepo
npm run desktop

# Ou directement
cd apps/desktop
npm run tauri:dev
```

## Build

```bash
# Depuis la racine du monorepo
npm run desktop:build

# Ou directement
cd apps/desktop
npm run tauri:build
```

## Note

L'application desktop utilise le même frontend que l'application mobile (Expo web export).
Le build Tauri bundle le frontend web exporté dans une application native.
