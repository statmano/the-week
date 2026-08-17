# the-week

This repository contains a small Progressive Web App called "The Week" — a weekly focus tool for setting 3–5 achievable goals, tracking progress, and viewing past-week completion.

Development
-----------

Open `index.html` in a local static server (recommended) or use VS Code Live Server. No build step required.

Run a quick static server (PowerShell / Windows):

```powershell
python -m http.server 8000
# or, if you use the Python launcher:
py -m http.server 8000
# then open http://localhost:8000/
```

The PWA registers a service worker. On Sundays the app will prompt you to add goals for the week.

A simple goal setting and tracking app
