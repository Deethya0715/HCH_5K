import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { closePool, ensureTributesTable } from "../lib/db.mjs";

function loadEnvFile(filePath) {
  let text = "";
  try {
    text = readFileSync(filePath, "utf8");
  } catch {
    return;
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

try {
  await ensureTributesTable();
  console.log("tributes table is ready");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Could not prepare the tributes table");
  process.exitCode = 1;
} finally {
  await closePool();
}
