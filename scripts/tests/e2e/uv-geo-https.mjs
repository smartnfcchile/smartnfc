import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";
import next from "next";

const hostname = "127.0.0.1";
const port = 3338;
const directory = mkdtempSync(join(tmpdir(), "uv-geo-tls-"));
const keyFile = join(directory, "loopback.key");
const certFile = join(directory, "loopback.crt");

let credentials;
try {
  execFileSync("openssl", [
    "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
    "-subj", "/CN=127.0.0.1", "-addext", "subjectAltName=IP:127.0.0.1",
    "-keyout", keyFile, "-out", certFile,
  ], { stdio: ["ignore", "ignore", "pipe"] });
  credentials = { key: readFileSync(keyFile), cert: readFileSync(certFile) };
} finally {
  rmSync(directory, { recursive: true, force: true });
}

const app = next({ dev: false, hostname, port });
await app.prepare();
createServer(credentials, app.getRequestHandler()).listen(port, hostname);
