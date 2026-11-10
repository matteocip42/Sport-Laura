# Sport

Appli de suivi sportif : séances de musculation, pilates, idées de repas, bien-être et bilan du mois.

Site statique : une seule page (`index.html`), sans étape de build. Les données sont enregistrées dans le navigateur de chaque appareil.

Sur iPhone : ouvrir le site dans Safari, puis Partager → « Sur l'écran d'accueil ».

## Synchronisation entre appareils

Le dossier `api/` contient un petit service (`api/sync.js`) qui garde une copie des données dans une base Redis rattachée au projet Vercel (Storage → Upstash for Redis). Dans l'appli : onglet Bilan, tout en bas, saisir le même code secret sur chaque appareil.
