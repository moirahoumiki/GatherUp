import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const migrationsDir = join(repoRoot, "supabase", "migrations");
const migrationFiles = readdirSync(migrationsDir).sort();

function readMigration(name: string) {
  return readFileSync(join(migrationsDir, name), "utf8");
}

describe("supabase migrations contract", () => {
  it("keeps a supabase CLI config file", () => {
    const config = readFileSync(join(repoRoot, "supabase", "config.toml"), "utf8");

    assert.match(config, /project_id = "gatherup"/);
  });

  it("names every migration with a sortable timestamp prefix", () => {
    assert.ok(migrationFiles.length >= 3, "expected at least the baseline migrations");

    for (const name of migrationFiles) {
      assert.match(name, /^\d{14}_[a-z0-9_]+\.sql$/, `${name} should match <14-digit timestamp>_<snake_case>.sql`);
    }
  });

  it("keeps the initial schema migration identical to the frozen schema.sql baseline", () => {
    const schema = readFileSync(join(repoRoot, "supabase", "schema.sql"), "utf8");
    const migration = readMigration("20260705000001_initial_schema.sql");

    assert.equal(migration, schema);
  });

  it("keeps the storage migration identical to the frozen storage.sql baseline", () => {
    const storage = readFileSync(join(repoRoot, "supabase", "storage.sql"), "utf8");
    const migration = readMigration("20260705000002_storage.sql");

    assert.equal(migration, storage);
  });

  it("locks down the rate limit table and RPC to the service role", () => {
    const migration = readMigration("20260705000100_api_rate_limits.sql");

    assert.match(migration, /create table if not exists public\.api_rate_limits/);
    assert.match(migration, /alter table public\.api_rate_limits enable row level security/);
    assert.match(migration, /revoke all on table public\.api_rate_limits from public, anon, authenticated/);
    assert.match(migration, /create or replace function public\.consume_rate_limit/);
    assert.match(
      migration,
      /revoke all on function public\.consume_rate_limit\(text, integer, integer\) from public, anon, authenticated/
    );
    assert.match(
      migration,
      /grant execute on function public\.consume_rate_limit\(text, integer, integer\) to service_role/
    );
    assert.match(migration, /security definer/);
  });

  it("creates events and their required owner, finance, collection-code, and audit records atomically", () => {
    const migration = readMigration("20260717000000_create_event_atomic.sql");

    assert.match(migration, /create or replace function public\.create_event_atomic/);
    assert.match(migration, /v_auth_user_id := auth\.uid\(\)/);
    assert.match(migration, /insert into public\.events/);
    assert.match(migration, /insert into public\.event_organizers/);
    assert.match(migration, /insert into public\.event_finance_settings/);
    assert.match(migration, /insert into public\.collection_code_versions/);
    assert.match(migration, /insert into public\.audit_logs/);
    assert.match(migration, /'event\.created'/);
    assert.match(migration, /when unique_violation then/);
    assert.match(migration, /'PUBLIC_CODE_CONFLICT'/);
    assert.match(migration, /security definer/);
    assert.match(migration, /revoke all on function public\.create_event_atomic/);
    assert.match(migration, /grant execute on function public\.create_event_atomic[\s\S]*to authenticated/);
  });

  it("reconciles organizer lifecycle fields for older clean-dev databases", () => {
    const migration = readMigration("20260719000000_reconcile_event_organizer_lifecycle.sql");

    assert.match(migration, /create type public\.event_organizer_status as enum \('invited', 'active', 'declined'\)/);
    assert.match(migration, /alter table public\.event_organizers/);
    assert.match(migration, /add column if not exists status event_organizer_status not null default 'active'/);
    assert.match(migration, /add column if not exists accepted_at timestamptz/);
    assert.match(migration, /add column if not exists declined_at timestamptz/);
    assert.match(migration, /where status = 'active'[\s\S]*and accepted_at is null/);
  });

  it("publishes aggregate registration counts without exposing registration rows", () => {
    const migration = readMigration("20260719000100_public_event_registration_counts.sql");

    assert.match(migration, /create or replace function public\.get_public_event_registration_counts/);
    assert.match(migration, /security definer/);
    assert.match(migration, /r\.status not in \('cancelled', 'expired', 'refunded'\)/);
    assert.match(migration, /e\.visibility in \('public', 'unlisted'\)/);
    assert.match(migration, /revoke all on function public\.get_public_event_registration_counts\(uuid\[\]\) from public/);
    assert.match(migration, /grant execute on function public\.get_public_event_registration_counts\(uuid\[\]\) to anon, authenticated/);
  });
});
