# Production Deployment & Operator Runbook

> **Target Audience:** Systems Operators, Platform Engineers, and Repository Owners.  
> **Repository:** `shaheenaslam10/knowledge-marketplace`  
> **Architecture Reference:** [docs/architecture/deployment.md](../architecture/deployment.md) · [ADR-0016](../process/adrs.md#adr-0016) · [ADR-0017](../process/adrs.md#adr-0017)  
> **Status:** Operator-ready. All local tests, builds, and smoke verifications passing.

---

## 1. System Overview & Architecture

The Hybrid Expert Marketplace is deployed as a single-host, multi-container stack orchestrated via Docker Compose (`docker-compose.prod.yml`). Ingress and automatic TLS termination are handled by Caddy.

```
                           +----------------------------------------+
                           |       Public Internet (HTTPS :443)     |
                           +----------------------------------------+
                                               |
                                               v
                        +-----------------------------------------------+
                        |             Caddy 2 Reverse Proxy             |
                        |      (Automatic Let's Encrypt TLS / HTTP-3)   |
                        +-----------------------------------------------+
                           /                   |                   \
                          /                    |                    \
       www / app / admin /                     |                     \ /static/*
                        v                      v                      v
        +-------------------------+  +-------------------+  +-------------------+
        |   Next.js 15 Standalone |  | Django ASGI (8000)|  | Caddy Direct      |
        |   Node.js (Port 3000)   |  | (1 uvicorn worker)|  | Static File Cache |
        |   Three Experiences     |  | HTTP + WebSockets |  | (Shared Volume)   |
        +-------------------------+  +-------------------+  +-------------------+
                                               |
                                               +--------------------+
                                               |                    |
                                               v                    v
                                     +--------------------+ +-------------------+
                                     |  PostgreSQL 16     | | Worker (qcluster) |
                                     |  (No public ports) | | (Waits on /readyz)|
                                     +--------------------+ +-------------------+
```

### Critical Architecture Contracts
1. **Four Production Hostnames:**
   - `SITE_DOMAIN` (e.g., `www.example.com`): Marketing experience (`/`, `/subjects`, `/pricing`, `/about`, `/for-experts`, `/terms`, `/privacy`, `/academic-integrity`).
   - `APP_DOMAIN` (e.g., `app.example.com`): Student & Expert workspaces (`/requests`, `/orders`, `/messages`, `/opportunities`, `/account`).
   - `ADMIN_DOMAIN` (e.g., `admin.example.com`): Staff Operations Portal (`/portal/*`) and Django Admin (`ADMIN_URL`).
   - `API_DOMAIN` (e.g., `api.example.com`): ASGI API backend, WebSocket connections (`/ws/*`), and health endpoints (`/healthz`, `/readyz`).
2. **Single ASGI Worker Constraint (ADR-0003):**
   - The Channels layer uses an in-memory channel backend to eliminate Redis complexity at MVP scale.
   - Uvicorn runs with `--workers 1` so that WebSocket connections and notification broadcasts share the same process memory.
3. **No Direct Database Exposure:**
   - PostgreSQL (`db` service) does NOT bind to any host ports (`ports:` is intentionally absent). It is only reachable within the private Docker bridge network.
4. **Fail-Closed Production Safety Gates (`apps/core/checks.py`):**
   - When `DEPLOY_ENV` is `production` or `staging`, the container executes `manage.py check --deploy --tag production --fail-level WARNING`.
   - The container **refuses to boot** if development secret keys, console email backend, self-confirm payment affordances, insecure cookies, or default `admin/` URLs are detected.

---

## Phase A: Prerequisites & External Services

Before executing a deployment on a production server, the owner must provision the following external resources:

### 1. VPS / Host Sizing
- **Recommended Providers:** Hetzner Cloud (CX22, ~€4/mo), Oracle Cloud Always Free (ARM 4 OCPU / 24 GB, $0), or standard DigitalOcean / Linode Droplet.
- **Minimum Specs:**
  - 2 vCPU
  - 2 GB RAM (4 GB recommended if building images directly on the host)
  - 20 GB SSD storage
  - OS: Ubuntu 22.04 LTS or 24.04 LTS (x86_64 or aarch64)

### 2. Domain Names & DNS Setup
Create 4 `A` (and optionally `AAAA`) records pointing to your server's public IP address:

| Subdomain | Record Type | Value | Target Experience |
|---|---|---|---|
| `www` (or apex) | A | `<Server-Public-IP>` | `SITE_DOMAIN` (Marketing) |
| `app` | A | `<Server-Public-IP>` | `APP_DOMAIN` (Student & Expert App) |
| `admin` | A | `<Server-Public-IP>` | `ADMIN_DOMAIN` (Operations Portal) |
| `api` | A | `<Server-Public-IP>` | `API_DOMAIN` (Backend REST & WebSockets) |

> [!IMPORTANT]
> **Apex Domain Redirection:** In `deploy/Caddyfile`, Caddy automatically redirects the bare apex domain `{$APEX_DOMAIN}` to `https://{$SITE_DOMAIN}`.
> Configure `APEX_DOMAIN` in your `.env.production` (e.g., `example.com`), and point an `A` record for your apex domain to the host IP. If you manage root domain redirection at your DNS registrar (e.g., Cloudflare Page Rules / URL Forwarding), set `APEX_DOMAIN` to match or point to Caddy.

### 3. Email Provider (SMTP or Brevo)
The platform requires transactional email for account verification, password resets, and critical business notifications.
- **Option 1: Brevo (Recommended, Free 300 emails/day)**
  - Sign up at [brevo.com](https://www.brevo.com).
  - Verify your sender domain with SPF, DKIM, and DMARC DNS records.
  - Generate an API Key under **SMTP & API → API Keys**.
  - Set `EMAIL_BACKEND_MODE=brevo` and `BREVO_API_KEY=<your-key>`.
- **Option 2: Standard SMTP (SendGrid, Postmark, AWS SES, Mailgun)**
  - Set `EMAIL_BACKEND_MODE=smtp`, `EMAIL_HOST`, `EMAIL_PORT=587`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`.

> [!CAUTION]
> `EMAIL_BACKEND_MODE=console` is rejected by `apps/core/checks.py` (`hem.E010`) in production. The container will fail to start if console email is configured.

### 4. Cloudflare R2 Object Storage (ADR-0006)
Uploaded documents, student deliverables, expert credentials, and dispute evidence require persistent, off-container storage.
- Sign up for Cloudflare and navigate to **R2 Object Storage**.
- Create a private bucket (e.g., `hem-prod-storage`).
- Generate R2 API tokens with `Admin Read & Write` permissions. Note:
  - Account ID
  - Access Key ID
  - Secret Access Key
- Leave CORS rules restricted to `https://app.example.com` and `https://admin.example.com`.

> [!CAUTION]
> `FILE_STORAGE=local` is rejected by `apps/core/checks.py` (`hem.E011`) in production. Ephemeral container filesystems destroy user uploads on redeployment.

### 5. Payment Gateway Configuration
- **Default State:** `PAYMENT_GATEWAY=manual`.
  - Fully functional out-of-the-box for bank transfer, wire, or local rails.
  - Set `MANUAL_PAYMENT_INSTRUCTIONS` with your account details and payment instructions for students.
  - Set a random `MANUAL_WEBHOOK_SECRET` for signature verification.
- **Stripe Activation (When desired):**
  - Follow the checklist in [`docs/workflows/payments.md`](../workflows/payments.md).
  - Switch `PAYMENT_GATEWAY=stripe`, provide `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
  - Point the Stripe webhook endpoint to: `https://api.example.com/api/v1/payments/webhooks/`.

### 6. Off-Host Backup Storage
- Prepare an off-host backup destination (e.g., a secondary R2 bucket or AWS S3 bucket).
- Install and configure `rclone` or `aws-cli` on the host to copy encrypted database dumps (`BACKUP_REMOTE_CMD`).

---

## Phase B: Server Setup & Hardening

Run these steps as `root` (or with `sudo`) on your freshly provisioned Linux VM.

### 1. Update Packages & Install Dependencies
```bash
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl git ufw fail2ban rclone openssl postgresql-client
```

### 2. Install Docker Engine & Docker Compose Plugin
```bash
# Install Docker via official script
curl -fsSL https://get.docker.com | sh

# Enable Docker on boot
sudo systemctl enable --now docker

# Create deploy user (if not already existing) and add to docker group
sudo usermod -aG docker "$USER"
```
*(Log out and log back in for group membership to take effect)*

### 3. Configure Host Firewall (UFW)
Only ports 22 (SSH), 80 (HTTP for ACME challenges), 443 (HTTPS), and 443/udp (HTTP-3 / QUIC) should be accessible from the public internet.

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment "SSH"
sudo ufw allow 80/tcp comment "HTTP (Caddy ACME)"
sudo ufw allow 443/tcp comment "HTTPS (Caddy)"
sudo ufw allow 443/udp comment "HTTP-3 (Caddy)"
sudo ufw enable
sudo ufw status verbose
```

### 4. Create Platform Directory
```bash
sudo mkdir -p /srv/hem
sudo chown -R "$USER":"$USER" /srv/hem
cd /srv/hem
```

---

## Phase C: Environment Configuration Contract

### 1. Clone Repository & Set Up Secrets
```bash
git clone https://github.com/shaheenaslam10/knowledge-marketplace.git /srv/hem
cd /srv/hem

# Create your production environment file
cp .env.prod.example .env.production
chmod 600 .env.production
```

### 2. Generate Cryptographically Secure Secrets
Run these generator commands on the host to create strong random values:

```bash
# 1. Django Secret Key (64 chars)
python3 -c 'import secrets; print(secrets.token_urlsafe(64))'

# 2. Database Password (32 chars)
python3 -c 'import secrets; print(secrets.token_urlsafe(32))'

# 3. Encrypted Backup Passphrase (Store this in 1Password / Bitwarden!)
openssl rand -base64 48

# 4. Manual Webhook HMAC Secret (16 hex chars)
openssl rand -hex 16

# 5. Obfuscated Admin Path (Do NOT use 'admin/')
python3 -c 'import secrets; print(f"portal-secret-{secrets.token_hex(8)}/")'
```

### 3. Populate `.env.production`
Open `.env.production` in your preferred editor (`nano .env.production`) and fill in every field.

#### Variable Classification Matrix

| Variable | Classification | Requirement | Description / Value |
|---|---|---|---|
| `DEPLOY_ENV` | Non-Secret | Required | Must be `production` (triggers safety checks) |
| `APP_VERSION` | Non-Secret | Optional | Release version, e.g., `1.0.0` |
| `SECRET_KEY` | **Secret** | Required | 64+ char random string generated above |
| `SITE_DOMAIN` | Non-Secret | Required | Public marketing domain, e.g., `www.example.com` |
| `APP_DOMAIN` | Non-Secret | Required | App domain, e.g., `app.example.com` |
| `ADMIN_DOMAIN` | Non-Secret | Required | Operations portal domain, e.g., `admin.example.com` |
| `API_DOMAIN` | Non-Secret | Required | Backend API domain, e.g., `api.example.com` |
| `APEX_DOMAIN` | Non-Secret | Required | Apex domain redirected to `SITE_DOMAIN`, e.g., `example.com` |
| `ACME_EMAIL` | Non-Secret | Required | Operator email for Let's Encrypt renewal notices |
| `ALLOWED_HOSTS` | Non-Secret | Required | Comma-separated: `api.example.com` |
| `FRONTEND_URL` | Non-Secret | Required | `https://app.example.com` |
| `BACKEND_URL` | Non-Secret | Required | `https://api.example.com` |
| `CORS_ALLOWED_ORIGINS` | Non-Secret | Required | `https://www.example.com,https://app.example.com,https://admin.example.com` |
| `CSRF_TRUSTED_ORIGINS` | Non-Secret | Required | `https://www.example.com,https://app.example.com,https://admin.example.com` |
| `POSTGRES_USER` | Non-Secret | Required | e.g. `hem` |
| `POSTGRES_PASSWORD` | **Secret** | Required | Strong random database password |
| `POSTGRES_DB` | Non-Secret | Required | `hem` |
| `DATABASE_URL` | **Secret** | Required | `postgres://hem:<DB_PASSWORD>@db:5432/hem` |
| `ADMIN_URL` | **Secret** | Required | Unguessable path, e.g., `portal-secret-xyz123/` |
| `COOKIE_SECURE` | Non-Secret | Required | `True` |
| `CSP_REPORT_ONLY` | Non-Secret | Required | `False` |
| `LOG_LEVEL` | Non-Secret | Optional | `INFO` |
| `EMAIL_BACKEND_MODE` | Non-Secret | Required | `brevo` or `smtp` (never `console`) |
| `DEFAULT_FROM_EMAIL` | Non-Secret | Required | e.g., `noreply@example.com` |
| `BREVO_API_KEY` | **Secret** | Conditional | Required if `EMAIL_BACKEND_MODE=brevo` |
| `FILE_STORAGE` | Non-Secret | Required | `r2` |
| `R2_BUCKET` | Non-Secret | Required | Name of your R2 bucket |
| `R2_ACCOUNT_ID` | **Secret** | Required | Cloudflare account ID |
| `R2_ACCESS_KEY` | **Secret** | Required | R2 access key ID |
| `R2_SECRET_KEY` | **Secret** | Required | R2 secret access key |
| `R2_REGION` | Non-Secret | Required | `auto` |
| `PAYMENT_GATEWAY` | Non-Secret | Required | `manual` (or `stripe` once onboarded) |
| `MANUAL_PAYMENT_INSTRUCTIONS` | Non-Secret | Required | Instructions for wire/transfer payments |
| `MANUAL_WEBHOOK_SECRET` | **Secret** | Required | HMAC token for manual webhook calls |
| `WORKERS` | Non-Secret | Optional | `2` (qcluster worker concurrency) |
| `NEXT_PUBLIC_API_URL` | Public Build Arg | Required | `https://api.example.com` |
| `NEXT_PUBLIC_WS_URL` | Public Build Arg | Required | `wss://api.example.com` |
| `NEXT_PUBLIC_SITE_URL` | Public Build Arg | Required | `https://www.example.com` |
| `BACKUP_PASSPHRASE` | **Secret** | Required | Strong passphrase for AES-256 backup encryption |
| `BACKUP_DIR` | Non-Secret | Optional | `./var/backups` |
| `BACKUP_RETENTION_DAYS` | Non-Secret | Optional | `30` |
| `BACKUP_REMOTE_CMD` | Non-Secret | Optional | e.g., `rclone copy $1 remote:backups/` |

---

## Phase D: Deployment Execution

The repository provides an idempotent, fail-closed deployment script: `scripts/deploy.sh`.

### 1. Execute First-Time Deployment
```bash
./scripts/deploy.sh --env production
```

### What Happens During `scripts/deploy.sh`:
1. **Tree Integrity Check:** Refuses to deploy if the git working tree has uncommitted modifications.
2. **Current State Capture:** Records the current release commit to `.deploy-state-production` so rollback has a verified target.
3. **Pre-Deploy Database Backup:** Runs `scripts/backup_db.sh` to generate an AES-256 encrypted dump before touching the schema.
4. **Container Build:** Builds backend and frontend production images without development dependencies. Injects `NEXT_PUBLIC_*` build arguments.
5. **Entrypoint Sequencing (`backend/docker/entrypoint.prod.sh`):**
   - Polls PostgreSQL until the database responds.
   - Executes `python manage.py check --deploy --tag production --fail-level WARNING`. (Fails if any insecure config is present).
   - Runs `python manage.py migrate --noinput` (safe forward-only migrations).
   - Runs `python manage.py collectstatic --noinput --clear` into the shared volume.
   - Boots `uvicorn` on port 8000 with 1 worker.
6. **Worker Boot:** `worker` container waits for API `/readyz` probe to return 200, then starts `qcluster`.
7. **Ingress Activation:** Caddy automatically issues Let's Encrypt TLS certificates for all 4 domains on first incoming HTTP request.
8. **Health Gate:** Polls API `/healthz` for up to 300 seconds until healthy.
9. **Automated Smoke Test:** Executes `scripts/smoke_test.sh` against live HTTPS endpoints.
10. **Automatic Rollback:** If the smoke test fails, `scripts/deploy.sh` automatically calls `scripts/rollback.sh` to restore the previous release!

### 2. Create the Initial Superuser
Once the stack is running healthy, create your initial administrative account:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec api \
  python manage.py createsuperuser
```
Provide an administrative email and a strong password.

> [!NOTE]
> `python manage.py seed_demo` is **hard-blocked** in `DEPLOY_ENV=production`. You cannot accidentally seed fake demo data into your production database.

---

## Phase E: Automated Verification & Health Checks

Once deployment completes, execute the built-in automated verification suite:

### 1. Probe Endpoints Manually
```bash
# 1. API Health (Checks DB connection)
curl -i https://api.example.com/healthz

# 2. API Readiness (Checks migrations applied)
curl -i https://api.example.com/readyz

# 3. Web root
curl -i https://www.example.com/
```

### 2. Execute Automated Smoke Test
```bash
./scripts/smoke_test.sh --api https://api.example.com --web https://app.example.com
```

This automated script asserts 22 mission-critical points:
- **Availability:** `/healthz`, `/readyz`, and web root return HTTP 200.
- **Database Connection:** JSON output from `/healthz` confirms `"database": true`.
- **API Contract:** Validates `/api/v1/` metadata envelope and `/api/schema/` OpenAPI specification.
- **Transport Security:** Verifies HSTS headers, `X-Content-Type-Options: nosniff`, and `Referrer-Policy`.
- **Content Security Policy (ADR-0017 / ADR-0018):**
  - Verifies CSP is **enforcing** (not report-only).
  - Asserts absence of `unsafe-inline` and `unsafe-eval` in `script-src`.
  - Probes dynamic and prerendered document routes (`/`, `/login`, `/about`) to ensure **every single script tag carries the per-request cryptographic nonce**.
- **Production Hygiene:** `X-Frame-Options: DENY`, no Django yellow traceback screens on 404 routes.
- **Authentication Boundaries:** Confirms anonymous requests to `/api/v1/me` and `/api/v1/ops/kpis` return 401 Unauthorized.
- **Legal Compliance:** Asserts reachability of `/terms`, `/privacy`, and `/academic-integrity`.

### 3. Check Background Worker & Scheduled Tasks
Check the status of Django-Q2 cluster and scheduled workers:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail 50 worker
```

Run an operational diagnostic sweep:
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec api \
  python manage.py ops_report --hours 24
```

---

## Phase F: Manual Post-Deploy Smoke Checklist

Perform these checks in a real web browser to verify end-to-end functionality:

### 1. DNS & SSL Termination
- [ ] Navigate to `https://www.example.com` in Chrome/Firefox.
- [ ] Confirm valid SSL padlock issued by Let's Encrypt.
- [ ] Check certificate details for `app.example.com`, `admin.example.com`, `api.example.com`.
- [ ] Verify HTTP → HTTPS redirect works (`http://www.example.com` redirects to `https://www.example.com`).

### 2. Public Marketing Experience (`SITE_DOMAIN`)
- [ ] Homepage (`/`) loads with hero, value propositions, and CTA buttons.
- [ ] `/subjects` loads subject cards; clicking a subject opens `/subjects/[slug]`.
- [ ] `/pricing` displays transparent commission breakdown (15% managed, 20% open).
- [ ] `/for-experts` and `/about` render correctly.
- [ ] Legal pages load: `/terms`, `/privacy`, `/academic-integrity`.

### 3. Student Registration & Request Funnel (`APP_DOMAIN`)
- [ ] Click **Sign Up** at `https://app.example.com/register`.
- [ ] Register a test student account.
- [ ] Verify receipt of confirmation email via Brevo/SMTP.
- [ ] Log in and access Student Dashboard at `/requests`.
- [ ] Click **Create Request**, complete academic integrity attestation, and submit a test request with an attachment.
- [ ] Confirm file uploaded successfully to Cloudflare R2.

### 4. Expert Application & Verification (`APP_DOMAIN` / `ADMIN_DOMAIN`)
- [ ] In an incognito window, register a second account as an expert.
- [ ] Complete the expert profile and application form (subjects, bio, credentials).
- [ ] Log into the Staff Portal at `https://admin.example.com/portal/moderation`.
- [ ] Or log into Django Admin at `https://admin.example.com/<ADMIN_URL>`.
- [ ] Approve the expert application.

### 5. Bidding & Order Pipeline
- [ ] As the approved expert, browse `/opportunities`.
- [ ] Submit an offer/bid on the student's request.
- [ ] In the student browser window, refresh `/requests/[id]`; observe the incoming offer.
- [ ] Student accepts the offer.
- [ ] Verify that an `Order` is atomically created (`/orders/[id]`).

### 6. Payment Flow (Manual Rails)
- [ ] Student views payment instructions on the order page.
- [ ] Student inputs a transaction reference ID and submits payment.
- [ ] Platform administrator navigates to `/portal/finance` or Django Admin `Payments`.
- [ ] Admin verifies payment and marks it confirmed.
- [ ] Order status updates to `in_progress`.

### 7. Realtime Messaging & Deliveries
- [ ] Open the order workspace in both browser windows.
- [ ] Send a chat message from student to expert.
- [ ] Confirm message appears in realtime via WebSocket without page reload.
- [ ] Expert submits a delivery file.
- [ ] Student reviews and approves the delivery.
- [ ] Order transitions to `completed`.
- [ ] Student submits a star review and testimonial.

---

## Phase G: Rollback Procedure

If an issue is discovered after deploying a release, execute an immediate rollback:

### 1. Automatic Rollback to Previous Release
```bash
./scripts/rollback.sh --env production
```

### 2. Rollback to a Specific Git Tag or Commit
```bash
./scripts/rollback.sh --env production --to v1.1.0
```

### What `scripts/rollback.sh` Does:
1. Identifies previous known-good commit from `.deploy-state-production` (or user `--to` target).
2. Checks out the target commit.
3. Rebuilds container images at that target.
4. Restarts containers with `--remove-orphans`.
5. Waits for API `/healthz` to report healthy.
6. Re-executes `scripts/smoke_test.sh` to confirm the rolled-back system is healthy.
7. Updates `.deploy-state-production`.

> [!IMPORTANT]
> **Database Policy: Forward-Only, Additive-First.**
> Containers are stateless, so rolling back code is fast and safe.
> `scripts/rollback.sh` deliberately **does NOT revert database migrations**.
> Our migration policy guarantees that a release never drops or renames database columns that the previous release depends on.
> If a data-corrupting event occurred, perform a full database restore using Phase H.

---

## Phase H: Database Backup & Restore Runbook

### 1. Automated Nightly Backups (Cron)
On the production server, configure a cron job under the deploy user or root:

```bash
crontab -e
```

Add the following entry to execute daily at 03:15 UTC:
```cron
15 3 * * * cd /srv/hem && set -a && . ./.env.production && set +a && ./scripts/backup_db.sh --label nightly >> /srv/hem/var/log/backup.log 2>&1
```

### 2. Manual Backup Trigger
```bash
# Export environment and trigger backup with a custom label
cd /srv/hem
set -a && . ./.env.production && set +a
./scripts/backup_db.sh --label manual-pre-maintenance
```

Backup artifacts created in `BACKUP_DIR` (`./var/backups`):
- `hem-production-<label>-<timestamp>.dump.enc`: AES-256 CBC encrypted PostgreSQL custom-format dump (`pg_dump -Fc`).
- `hem-production-<label>-<timestamp>.dump.enc.sha256`: SHA-256 checksum of the encrypted file.
- Automatically uploaded off-host if `BACKUP_REMOTE_CMD` is configured.
- Local backups older than `BACKUP_RETENTION_DAYS` (30 days) are pruned automatically.

### 3. Restore Drill (Non-Destructive Rehearsal)
Run a quarterly drill to verify that backups decrypt and restore cleanly:

```bash
cd /srv/hem
set -a && . ./.env.production && set +a

./scripts/restore_backup.sh ./var/backups/hem-production-nightly-20260928T031500Z.dump.enc --drill
```

The drill script:
1. Validates the SHA-256 checksum before touching secrets.
2. Decrypts the dump in memory / temp file using `BACKUP_PASSPHRASE`.
3. Creates a temporary scratch database on the Postgres server (`hem_restore_drill_<timestamp>`).
4. Executes `pg_restore` into the scratch database.
5. Verifies row counts across `accounts_user`, `service_requests`, `orders`, `payments`, and `ledger`.
6. Executes SQL assertion for **BR-33 Ledger Invariant** (sum of charges = sum of commissions + expert payouts).
7. Automatically drops the scratch database and cleans up temp files.

### 4. Full Production Disaster Recovery
If the production database has experienced catastrophic failure or data corruption:

```bash
# 1. Stop web traffic
docker compose -f docker-compose.prod.yml --env-file .env.production stop web api worker

# 2. Restore into production database
./scripts/restore_backup.sh ./var/backups/<backup-file>.dump.enc --target postgres://hem:<PASSWORD>@db:5432/hem

# 3. Restart application containers
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# 4. Verify system health
./scripts/smoke_test.sh --api https://api.example.com --web https://app.example.com
```

---

## 9. Operator FAQ & Troubleshooting

### Q: The API container fails to start with exit code 1.
**A:** Check container logs:
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs api
```
Look for `apps/core/checks.py` messages. Common causes:
- `hem.E001`: `SECRET_KEY` is still the development default.
- `hem.E010`: `EMAIL_BACKEND_MODE=console` (set to `brevo` or `smtp`).
- `hem.E011`: `FILE_STORAGE=local` (set to `r2` with credentials).
- `hem.E007`: `PAYMENT_DEV_SELF_CONFIRM` is present in `.env.production`.
- `hem.W006`: `ADMIN_URL` is set to `admin/` (change to an obfuscated path).

### Q: Let's Encrypt certificate issuance fails in Caddy.
**A:** Check Caddy logs:
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs caddy
```
- Ensure DNS A records for all 4 domains point to the server's public IP.
- Confirm ports 80 and 443 are open on your host firewall (`sudo ufw status`).
- Check that `ACME_EMAIL` in `.env.production` is a valid email address.
- Verify `APEX_DOMAIN` in `.env.production` matches your apex domain and points to the server IP.

### Q: WebSocket chat disconnects immediately or fails to connect.
**A:** 
- Confirm `NEXT_PUBLIC_WS_URL` is set to `wss://api.example.com` (using `wss://` over HTTPS).
- Ensure Caddy proxy timeout is set to 3600s (already default in `deploy/Caddyfile`).
- Ensure Uvicorn runs with `--workers 1` (default in `docker-compose.prod.yml`). In-memory Channels layer requires single-worker concurrency.

### Q: How do I view live application logs?
```bash
# All services
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f

# Just API structured JSON logs
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f api

# Just Worker background tasks
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f worker
```
