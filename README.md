# Estate4Mission Website

Premium Estate4Mission demo website with a small Node.js backend for:

- Dynamic plot listings
- Admin plot management
- Plot detail pages
- Gambia market news feed

## Local Run

```bash
npm start
```

Open:

```text
http://localhost:4174
```

## Admin

Set the admin password with an environment variable:

```bash
ADMIN_PASSWORD=your-secure-password npm start
```

For local fallback only, the server uses `Estate4Mission2026` when no environment variable is set.

## Render Demo Deployment

1. Push this complete folder to a GitHub repository.
2. Go to Render and create a new Web Service from that GitHub repository.
3. Render can use `render.yaml`, or set manually:

```text
Build Command: npm install
Start Command: npm start
Health Check Path: /api/health
```

4. Add this Render environment variable:

```text
ADMIN_PASSWORD = choose-a-secure-password
```

5. Deploy. Render will create a public demo URL.

## Important Demo Note

On free hosting, local JSON file edits can reset after redeploys. This is fine for shareholder review, but production should use a database and image storage.
