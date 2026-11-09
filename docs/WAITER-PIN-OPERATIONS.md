# Waiter PIN operations

Waiters authenticate with only their personal numeric PIN. They do not enter a waiter code, email address, or password. Cashier, manager, and administrator accounts continue to use email and password.

## Setup

1. Start the system using the repository README instructions.
2. Sign in to the manager dashboard at `http://localhost:5174` using a manager/admin account.
3. Create a waiter with a display name and unique waiter code.
4. In the **Waiter PINs** section, enter a 4–8 digit PIN and choose **Set PIN**. To change it later, enter a new PIN and choose **Reset PIN**.
5. Give the PIN privately to the waiter. The app does not display the PIN again after it is saved.
6. Waiters open `http://localhost:5173/waiter.html` and enter only their PIN.

Each PIN must be unique across waiter accounts. The server bcrypt-hashes the PIN for verification and stores a keyed HMAC fingerprint for lookup and uniqueness enforcement. The raw PIN is not stored. Do not log, message, or share PINs in public channels.

## Existing database migration

The Docker initialization scripts run only when PostgreSQL initializes a new, empty data volume. For a database that already exists, apply the migration once from the repository root:

```bash
docker compose exec -T postgres psql -U citysquare -d citysquare < database/init/04_waiter_pin_login.sql
```

This adds the PIN hash and fingerprint columns and the uniqueness indexes. Keep a database backup before applying schema changes.

## PIN fingerprint secret

Set `WAITER_PIN_PEPPER` to a long, random secret in the backend environment and keep the same value across restarts and deployments. The current backend falls back to `JWT_SECRET` if `WAITER_PIN_PEPPER` is not set; changing the pepper later invalidates PIN lookup until managers reset the waiters' PINs. Never commit production secrets to Git.

## API smoke check

After signing in as a manager or admin, set a PIN for an existing waiter using the manager token and waiter UUID:

```bash
curl -X POST http://localhost:3000/staff/waiters/WAITER_UUID/pin \
  -H 'Authorization: Bearer MANAGER_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"pin":"583921"}'
```

Expected response includes `"pinSet": true`; it does not return the PIN. Reusing the same PIN for another waiter should return a conflict response. Verify login using only the PIN:

```bash
curl -X POST http://localhost:3000/auth/waiter-pin-login \
  -H 'Content-Type: application/json' \
  -d '{"pin":"583921"}'
```

A successful response contains a token and a waiter identity with role `WAITER`. Do not use the example PIN above in a real deployment.

## Security note

Numeric PINs are convenient but have less entropy than passwords. Prefer 6–8 digits, keep the PIN private, use a unique PIN per waiter, and restrict API access to the trusted restaurant LAN. Add request throttling and lockout controls before production deployment; PIN-only login is not suitable for an API exposed to the public internet.
