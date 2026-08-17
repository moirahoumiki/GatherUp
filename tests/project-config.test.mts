import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const nextConfig = readFileSync(join(repoRoot, "next.config.ts"), "utf8");

describe("project configuration", () => {
  it("keeps npm dependencies pinned to exact versions", () => {
    const dependencyGroups = [packageJson.dependencies ?? {}, packageJson.devDependencies ?? {}];

    for (const dependencies of dependencyGroups) {
      for (const [name, version] of Object.entries(dependencies)) {
        assert.doesNotMatch(version, /latest|^\^|^~/, `${name} should be pinned to an exact version`);
      }
    }
  });

  it("keeps production security headers configured", () => {
    for (const header of [
      "X-Frame-Options",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy",
      "Content-Security-Policy",
      "Strict-Transport-Security"
    ]) {
      assert.match(nextConfig, new RegExp(header), `Missing ${header} header`);
    }

    assert.match(nextConfig, /value: "DENY"/);
    assert.match(nextConfig, /value: "nosniff"/);
    assert.match(nextConfig, /strict-origin-when-cross-origin/);
    assert.match(nextConfig, /max-age=63072000/);
    assert.match(nextConfig, /includeSubDomains/);
    assert.match(nextConfig, /default-src 'self'/);
    assert.match(nextConfig, /https:\/\/\*\.supabase\.co/);
    assert.match(nextConfig, /frame-ancestors 'none'/);
  });

  it("keeps the auth proxy inside src/ so Next.js picks it up", () => {
    assert.ok(existsSync(join(repoRoot, "src", "proxy.ts")), "src/proxy.ts must exist");
    assert.ok(
      !existsSync(join(repoRoot, "middleware.ts")),
      "middleware.ts must not live at the repo root: Next.js silently ignores it when the project uses src/"
    );
  });

  it("allows Supabase-hosted images through the Next image optimizer", () => {
    assert.match(nextConfig, /remotePatterns/);
    assert.match(nextConfig, /hostname: "\*\.supabase\.co"/);
  });
});
