// Load .env into process.env for tests (Node does not auto-load it, and the
// env.ts zod validation runs at import time). Node 20.12+/22 has loadEnvFile.
const proc = process as unknown as { loadEnvFile?: (path?: string) => void };
try {
  proc.loadEnvFile?.(".env");
} catch {
  // .env already loaded or absent — env.ts will surface any missing vars.
}
