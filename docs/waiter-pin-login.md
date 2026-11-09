# Waiter PIN authentication

Waiters sign in using only their unique 4–8 digit PIN at `/waiter.html`. They do not enter a waiter code or email. Each PIN can be assigned to only one waiter. Admin, manager, and cashier accounts continue to use normal email/password credentials.

A manager/admin sets or changes a waiter PIN with an authenticated `POST /staff/waiters/:waiterId/pin` request and JSON body `{ "pin": "..." }`. The PIN is bcrypt-hashed for verification; a keyed HMAC fingerprint supports unique lookup and a database uniqueness constraint prevents duplicate assignment. Set a strong, stable `WAITER_PIN_PEPPER` secret (or use the stable `JWT_SECRET` as the fallback) in the backend environment before assigning PINs, and keep it consistent across restarts and devices. Never log or store the raw PIN.

Existing databases must apply `database/init/04_waiter_pin_login.sql` before using PIN login. Docker applies initialization SQL only when creating a fresh data volume. For an existing Compose database, run from the project root:

```bash
docker compose exec -T postgres psql -U citysquare -d citysquare < database/init/04_waiter_pin_login.sql
```

See [Waiter PIN operations](WAITER-PIN-OPERATIONS.md) for dashboard steps and API smoke checks. Add login throttling and lockout controls before production deployment; keep the API restricted to the restaurant LAN.
