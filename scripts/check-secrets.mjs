import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Findings contain locations and rule names only. Never print matching values.
const rules = [
  ["email-provider-key", /\bre_[A-Za-z0-9_-]{20,}\b/],
  ["github-token", /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/],
  ["aws-access-key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ["private-key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ["database-password", /\b(?:postgres(?:ql)?|mysql):\/\/[^\s:@/]+:[^\s@/]+@(?!localhost(?=[:/\s]|$)|127\.0\.0\.1(?=[:/\s]|$)|\[::1\])[^\s/]+/i],
];

export function scanText(text, file) {
  const findings = [];
  text.split(/\r?\n/).forEach((line, index) => {
    for (const [rule, pattern] of rules) {
      if (pattern.test(line)) findings.push({ file, line: index + 1, rule });
    }
  });
  return findings;
}

export function scanRepository(cwd = process.cwd()) {
  const files = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd, encoding: "utf8" }).split("\0");
  const findings = [];
  for (const file of new Set(files.filter(Boolean))) {
    const fullPath = resolve(cwd, file);
    if (!existsSync(fullPath)) continue;
    const bytes = readFileSync(fullPath);
    // Binary artifacts require a separate review; this is a source-text check.
    if (bytes.includes(0)) continue;
    findings.push(...scanText(bytes.toString("utf8"), file));
  }
  return findings;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const findings = scanRepository();
    console.log(JSON.stringify({ findings, count: findings.length }));
    process.exitCode = findings.length ? 1 : 0;
  } catch {
    console.error("Secret scan could not complete. No file contents were printed.");
    process.exitCode = 2;
  }
}
