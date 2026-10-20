-- Each JSON document the app keeps (accounts, menus, screens, tracker, waitlist) is one row.
-- Writers lock the row (SELECT ... FOR UPDATE), so concurrent updates never lose each other's changes.
CREATE TABLE documents (
  name TEXT PRIMARY KEY,
  body JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
