# MyStudyPlanner

Application de planification de révisions pour les étudiants en médecine (Externes France).

## Structure du projet

```
/
├── apps/
│   ├── mobile/          # Application Expo (iOS/Android/Web)
│   └── desktop/         # Application Tauri (macOS/Windows/Linux)
├── backend/             # API FastAPI + MongoDB
└── packages/
    ├── api-client/      # Client API partagé + Stores Zustand
    └── shared-ui/       # Composants React Native partagés
```

## Fonctionnalités

- **Méthodes de révision**: J-Method (J0, J1, J3, J7...), SRS (SM-2), Tours
- **Calendrier intelligent**: Visualisation des sessions planifiées
- **Synchronisation ICS**: Import de calendriers externes
- **Événements personnels**: Création d'événements récurrents
- **Mode hors-ligne**: Synchronisation différée
- **Multi-plateforme**: iOS, Android, Web, macOS, Windows, Linux

## Configuration

### Backend

1. Créer le fichier `backend/.env`:
```env
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/mystudyplanner
JWT_SECRET=your-secure-jwt-secret
```

2. Installer les dépendances:
```bash
cd backend
pip install -r requirements.txt
```

3. Lancer le serveur:
```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Application Mobile (Expo)

1. Créer le fichier `apps/mobile/.env`:
```env
EXPO_PUBLIC_BACKEND_URL=https://your-backend-url.up.railway.app
```

2. Installer les dépendances (à la racine):
```bash
npm install
```

3. Lancer l'app:
```bash
cd apps/mobile
npx expo start
```

### Application Desktop (Tauri)

1. Prérequis:
   - Rust (https://rustup.rs)
   - Node.js 18+

2. Build:
```bash
cd apps/desktop
npm run tauri build
```

## Auto-Update (Desktop)

Pour que l'auto-update fonctionne:

1. **Générer une paire de clés de signature**:
```bash
npm run tauri signer generate -- -w ~/.tauri/mystudyplanner.key
```

2. **Mettre à jour la pubkey** dans `apps/desktop/src-tauri/tauri.conf.json`

3. **Configurer GitHub Actions** avec les secrets:
   - `TAURI_SIGNING_PRIVATE_KEY`: Contenu de la clé privée
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: Mot de passe (optionnel)

4. **Créer le fichier `latest.json`** dans les releases GitHub:
```json
{
  "version": "1.0.9",
  "notes": "Release notes",
  "pub_date": "2024-01-01T00:00:00Z",
  "platforms": {
    "darwin-aarch64": {
      "signature": "contenu_du_fichier.sig",
      "url": "https://github.com/user/repo/releases/download/v1.0.9/MyStudyPlanner_1.0.9_aarch64.app.tar.gz"
    },
    "darwin-x86_64": {
      "signature": "contenu_du_fichier.sig",
      "url": "https://github.com/user/repo/releases/download/v1.0.9/MyStudyPlanner_1.0.9_x64.app.tar.gz"
    }
  }
}
```

## Build TestFlight/App Store

```bash
cd apps/mobile
eas build --platform ios --profile production
eas submit --platform ios
```

## Credentials Admin

- Email: `admin@mystudyplanner.com`
- Password: `Admin123!`

## API Endpoints

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/google` - Auth Google
- `POST /api/auth/apple` - Auth Apple

### Sessions
- `GET /api/sessions/today` - Sessions du jour
- `GET /api/sessions/late` - Sessions en retard
- `POST /api/sessions/{id}/complete` - Marquer complète

### Catalogue
- `GET /api/catalog/all` - Tous les cours
- `POST /api/user/courses` - Créer un cours perso

## License

MIT
