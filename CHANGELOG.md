# Changelog

All notable changes to this project will be documented in this file.

## [1.5.0] - 2026-03-23

### Added
- **Système de Notifications** : Notifications quotidiennes configurables pour les sessions du jour et les sessions en retard
  - Toggle ON/OFF pour les notifications des sessions du jour
  - Toggle ON/OFF pour les notifications des sessions en retard
  - Sélecteur d'heure personnalisable (par défaut 8h00)
  - Boutons rapides : 7h00, 8h00, 9h00, 12h00, 18h00, 20h00
  - Sélecteur d'heure avancé avec heures (0-23) et minutes (0-55)
  - Indicateur de statut des permissions
- Nouveau store Zustand `notificationStore` pour la persistance des préférences
- Permissions Android pour les notifications (RECEIVE_BOOT_COMPLETED, VIBRATE, SCHEDULE_EXACT_ALARM)
- Plugin `expo-notifications` configuré dans app.json

### Fixed
- Console de développement ne s'ouvre plus automatiquement sur desktop (Tauri)
- Données utilisateur maintenant correctement isolées entre les comptes (reset des stores au logout)

### Changed
- Interface du modal de notifications complètement redessinée
- Amélioration de l'UX avec icônes visuelles pour chaque type de notification

---

## [1.4.0] - 2026-03-15

### Added
- **Session unique** : Ajout d'une session ponctuelle sans méthode de révision récurrente
- Thème système par défaut (suit le mode sombre/clair de l'OS)
- Modal de confirmation personnalisé pour les suppressions (compatible macOS/Tauri)

### Fixed
- Correction du dark mode sur les pages légales
- Correction du dark mode sur le calendrier mensuel
- Correction de l'isolation des données entre utilisateurs
- KeyboardAvoidingView ajouté à tous les modals avec saisie
- Icône de l'application desktop sans fond blanc

### Changed
- SessionCard redesigné pour supporter les thèmes dynamiques

---

## [1.3.0] - 2026-03-01

### Added
- Méthode J (J0, J1, J3, J7, J14, J30, J60, J120)
- Méthode SRS (SM-2 algorithm)
- Méthode Tours
- Système de badges et gamification
- Calendrier ICS synchronisé
- Export de données RGPD
- Suppression de compte RGPD

### Fixed
- Amélioration des performances du calendrier
- Correction des fuites de mémoire

---

## [1.2.0] - 2026-02-15

### Added
- Connexion Apple Sign-In
- Connexion Google
- Gestion des événements personnels
- Statistiques détaillées

---

## [1.1.0] - 2026-02-01

### Added
- Application desktop (Tauri) pour macOS et Windows
- Mise à jour automatique de l'app desktop

---

## [1.0.0] - 2026-01-15

### Added
- Version initiale
- Authentification email/mot de passe
- Catalogue de cours médecine
- Planification des révisions
- Calendrier intégré
- Mode sombre
