# Waiter PIN authentication

Waiters sign in using only their unique 4–8 digit PIN at `/waiter.html`. They do not enter a waiter code or email. Each PIN can be assigned to only one active waiter. Admin and manager accounts, and cashier accounts, continue to use their normal email/password credentials.

A manager/admin sets or changes a waiter PIN with an authenticated `POST /staff/waiters/:waiterId/pin` request and JSON body `{ "pin": "..." }`. The PIN is bcrypt-hashed for verification; a keyed HMAC fingerprint supports unique lookup and a database uniqueness constraint prevents duplicate assignment. Set a strong stable `WAITER_PIN_PEPPER` secret (or use the stable `JWT_SECRET` as the fallback) in the backend environment before assigning PINs, and keep it consistent across restarts/devices. Never log or store the raw PIN.

Existing databases must apply `database/init/04_waiter_pin_login.sql` before using PIN login. New Docker-initialized databases apply the SQL script automatically.
