# Index Compteur Radio

Static GitHub Pages PWA for shared radio meter readings backed by Google Sheets and Google Apps Script.

## Files

- `index.html` is the app shell.
- `styles.css` contains the phone-first layout.
- `app.js` reads and writes shared readings through Google Apps Script.
- `config.js` contains the deployed Google Apps Script Web App URL.
- `google-apps-script.gs` is the script to paste into Google Apps Script.
- `manifest.webmanifest` makes the app installable.
- `service-worker.js` caches the app for offline use.

## Google Sheets setup

1. Create a Google Sheet.
2. Open Extensions > Apps Script.
3. Paste the contents of `google-apps-script.gs`.
4. Change `DEFAULT_ADMIN_KEY`.
5. Run `setup()` once.
6. Deploy as Web App:
   - Execute as: Me
   - Who has access: Anyone
7. Copy the Web App URL into `config.js`.

Normal user URL: open the app normally.

Admin URL: add `?admin=1` to the app URL.

## GitHub Pages

1. Push these files to a GitHub repository on the `main` branch.
2. In GitHub, open Settings > Pages.
3. Set Source to `GitHub Actions`.
4. The included workflow deploys the static app automatically.
