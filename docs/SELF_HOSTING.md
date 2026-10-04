# Self-host EACH on a laptop

EACH has two local modes:

- **Browser-only:** Vite + `localStorage`; fastest for trying the UI.
- **Open database:** Vite + Frappe + MariaDB; data survives browser resets and is stored in a Docker volume on your laptop.

The open-database stack installs Frappe v15, ERPNext, the small `each_backend`
persistence app, MariaDB, and Redis. No hosted account
or paid database is required.

Frappe HR and Frappe CRM remain the locked native mapping targets. They are not
installed in the laptop baseline yet because EACH currently persists through
the workspace bridge and their unused frontend dependency builds materially
raise first-run memory and disk requirements.

## Requirements

- Git
- Node.js 20 or newer
- Docker Desktop (or Docker Engine + Compose v2)
- About 8 GB free disk space; the first Frappe setup downloads and builds several apps

On Apple Silicon, the Frappe container uses Docker's `linux/amd64` emulation so
the pinned Python dependency wheels remain reproducible. MariaDB and Redis still
run natively.

## First run

```bash
git clone https://github.com/Nonarkara/each.git
cd each
cp .env.example .env
npm install
npm run stack:up
npm run stack:logs
```

The first backend start can take 10–20 minutes. It skips the upstream Desk asset
build because EACH supplies the UI. Wait until the log shows the
web process listening on port 8000, then stop following logs with `Ctrl+C`.

1. In another terminal, run `npm run dev`.
2. Sign in at `http://each.localhost:8000/login` using your local Frappe account.
3. Open `http://each.localhost:5173` and reload after signing in.

Use the `each.localhost` address, not `localhost`, for the database-backed mode.
Both ports need the same hostname so the browser sends the Frappe session cookie.

EACH will hydrate from MariaDB after the Frappe session is available. The header
shows `MariaDB via Frappe` when connected. If the backend is stopped, the app
continues from its browser cache and reports `Database offline · local fallback`.

## Daily commands

```bash
npm run stack:up       # start Frappe, MariaDB, and Redis
npm run stack:logs     # follow backend setup/runtime logs
npm run stack:down     # stop containers; keep all data volumes
npm run dev            # start the EACH React UI
```

## Back up the database

```bash
docker compose exec frappe \
  bench --site each.localhost backup --with-files
```

Frappe writes the backup inside the persistent `each-bench` volume. Copy the
generated backup to the repo host before removing volumes:

```bash
docker compose cp frappe:/home/frappe/bench-data/frappe-bench/sites/each.localhost/private/backups ./backups
```

The `backups/` directory can contain business data and must not be committed.

## Reset local data

This deletes the Docker database and bench volumes. Export anything you need first.

```bash
docker compose down --volumes
```

## Security boundary

The Compose setup is a development profile intended for one laptop. It uses a
known default Administrator password and permits the Vite development origin.
The frontend uses an existing Frappe session and sends its CSRF token on writes;
passwords are never bundled into the frontend. Existing volumes are migrated back
to CSRF protection on the next container start. Demo and reset data cannot be saved
over the database workspace.
Services are bound to `127.0.0.1`, but you must still change the passwords and use Frappe Docker's
production deployment path before exposing any service to a network.

Google sign-in requires server configuration: set `each_google_client_id` to the
same public client ID as `VITE_GOOGLE_CLIENT_ID` and `each_axiom_allowed_emails` to
a JSON list of authorized email addresses in Frappe's site configuration. The
server verifies Google's signature, audience, issuer, expiration and verified
email before returning Axiom access. This UI sign-in does not replace the separate
Frappe session required for database access. Static GitHub Pages runs the demo
and custom local workspaces; Google access fails closed without a backend.

The database is MariaDB (GPL-2.0). ERPNext and Frappe HR are GPL-3.0, Frappe CRM
is AGPL-3.0, and the Frappe Docker tooling is MIT-licensed.
