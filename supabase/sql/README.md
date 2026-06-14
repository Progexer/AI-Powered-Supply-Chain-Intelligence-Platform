# Supabase SQL Scripts

Run these scripts in order inside the Supabase Dashboard SQL Editor.

1. `00_extensions_and_types.sql`
2. `01_core_schema.sql`
3. `02_rls_policies.sql`
4. `03_bi_views.sql`
5. `04_verification_queries.sql`
6. `05_smoke_test_rollback.sql`
7. `06_user_workspaces.sql`

The smoke test uses `rollback`, so it validates relationships without leaving test rows in the database.

Do not use a local database for this project. Supabase PostgreSQL is the only database.
