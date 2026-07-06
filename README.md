# Index Compteur Radio

Static GitHub Pages PWA for recording radio meter readings.

## Files

- `index.html` is the app shell.
- `styles.css` contains the phone-first layout.
- `app.js` saves readings in browser storage and exports an Excel-compatible fiche.
- `manifest.webmanifest` makes the app installable.
- `service-worker.js` caches the app for offline use.

## GitHub Pages

1. Push these files to a GitHub repository on the `main` branch.
2. In GitHub, open Settings > Pages.
3. Set Source to `GitHub Actions`.
4. The included workflow deploys the static app automatically.
