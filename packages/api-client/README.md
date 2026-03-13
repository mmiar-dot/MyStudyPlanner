# @mystudyplanner/api-client

Client API et stores Zustand partagés.

## Installation

Ce package est utilisé en interne dans le monorepo.

## Exports

### API Client

```tsx
import { createApiClient, getApiClient, configureStorage } from '@mystudyplanner/api-client';

// Initialisation
configureStorage(SecureStore, AsyncStorage);
createApiClient('https://api.example.com');

// Utilisation
const api = getApiClient();
const response = await api.get('/auth/me');
```

### Stores

```tsx
import { useAuthStore } from '@mystudyplanner/api-client';

const { user, login, logout } = useAuthStore();
```

### Types

```tsx
import type { User, CatalogItem, StudySession } from '@mystudyplanner/api-client';
```
