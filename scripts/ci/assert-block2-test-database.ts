// H-5: CI guard for Block 2's disposable PostgreSQL configuration.
//
// This script exists ONLY to turn "the DB required for Block 2 integration tests is missing or
// misconfigured" into a hard CI failure (exit code != 0), instead of the silent, green skip that
// scripts/tests/entitlements-*.test.ts and scripts/tests/local-location-orphans.test.ts already
// produce on purpose for local development (see their `{ skip: !allowed }` gate).
//
// It intentionally reimplements the exact same `allowed` predicate used by those suites — a
// loopback hostname plus a pathname containing "block2_disposable" — so that "the guard passed"
// and "the suites will actually run, not skip" are the same claim, verified once, in one place.
//
// This script is a CI-only tripwire. It never connects to any database (Neon, production, or
// otherwise) and never prints the URL's credentials. Local development is unaffected: a developer
// who runs the entitlements suites directly without BLOCK2_TEST_DATABASE_URL still gets the
// existing, permissive skip behavior from the suites themselves — this guard is a separate,
// additional step that only CI is expected to run.

const ALLOWED_HOSTNAMES = new Set(["127.0.0.1", "localhost"]);
const REQUIRED_PATHNAME_SUBSTRING = "block2_disposable";

function redacted(url: URL): string {
  return `${url.protocol}//${url.hostname}${url.port ? ":" + url.port : ""}${url.pathname}`;
}

function fail(message: string): never {
  console.error(`[assert-block2-test-database] FALLO: ${message}`);
  console.error(
    "[assert-block2-test-database] BLOCK2_TEST_DATABASE_URL debe apuntar a un PostgreSQL " +
      "desechable local (host localhost/127.0.0.1) cuya base de datos incluya 'block2_disposable' " +
      "en el nombre. Nunca Neon, nunca producción."
  );
  process.exit(1);
}

function main() {
  const raw = process.env.BLOCK2_TEST_DATABASE_URL;

  if (!raw || raw.trim() === "") {
    fail("BLOCK2_TEST_DATABASE_URL no está configurada.");
  }

  let url: URL;
  try {
    url = new URL(raw!);
  } catch {
    fail("BLOCK2_TEST_DATABASE_URL no es una URL válida.");
  }

  if (url!.protocol !== "postgresql:" && url!.protocol !== "postgres:") {
    fail(`Esquema no permitido (${url!.protocol}). Se esperaba postgresql:// o postgres://.`);
  }

  if (!ALLOWED_HOSTNAMES.has(url!.hostname)) {
    fail(`Host no permitido (${url!.hostname}). Solo localhost/127.0.0.1 — nunca un host remoto ni Neon.`);
  }

  if (!url!.pathname.includes(REQUIRED_PATHNAME_SUBSTRING)) {
    fail(`El nombre de la base (${url!.pathname}) no contiene "${REQUIRED_PATHNAME_SUBSTRING}".`);
  }

  console.log(`[assert-block2-test-database] OK: ${redacted(url!)}`);
  process.exit(0);
}

main();
