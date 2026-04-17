-- TASK-034: Operator waitlist table
-- Apply via Supabase dashboard SQL editor or the CLI before deploying the
-- /api/operator-waitlist route. Safe to re-run (IF NOT EXISTS).

create table if not exists operator_waitlist (
  email       text primary key,
  source      text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_operator_waitlist_created_at
  on operator_waitlist (created_at desc);

-- Row Level Security: no direct client access. Only the service role
-- (used by the /api/operator-waitlist route) should write or read.
alter table operator_waitlist enable row level security;

-- No policies added: default-deny for anon + authenticated users.
-- Service role bypasses RLS automatically.
