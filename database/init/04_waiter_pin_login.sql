ALTER TABLE waiters ADD COLUMN IF NOT EXISTS pin_hash TEXT;
ALTER TABLE waiters ADD COLUMN IF NOT EXISTS pin_fingerprint CHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS waiters_pin_fingerprint_unique
  ON waiters(pin_fingerprint)
  WHERE pin_fingerprint IS NOT NULL;
