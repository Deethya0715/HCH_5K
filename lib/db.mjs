import pg from "pg";

const Pool = pg.Pool || pg.default?.Pool;

let pool;
let schemaReady;

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS tributes (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    contact_email TEXT NOT NULL,
    hero_name TEXT NOT NULL,
    ribbon_color TEXT NOT NULL,
    message TEXT NOT NULL,
    sign_type TEXT NOT NULL,
    photo_url TEXT,
    qr_link TEXT,
    submitter_name TEXT,
    phone TEXT,
    relationship TEXT,
    photo_token TEXT,
    photo_bytes BYTEA,
    photo_content_type TEXT,
    photo_filename TEXT,
    caring_bridge_url TEXT,
    treatment_date TEXT,
    milestone TEXT,
    sponsor_name TEXT,
    return_method TEXT,
    mail_address TEXT
  )
`;

const EXTRA_COLUMNS = [
  "created_at TIMESTAMPTZ",
  "qr_link TEXT",
  "submitter_name TEXT",
  "phone TEXT",
  "relationship TEXT",
  "photo_url TEXT",
  "photo_token TEXT",
  "photo_bytes BYTEA",
  "photo_content_type TEXT",
  "photo_filename TEXT",
  "caring_bridge_url TEXT",
  "treatment_date TEXT",
  "milestone TEXT",
  "sponsor_name TEXT",
  "return_method TEXT",
  "mail_address TEXT",
];

export function databaseUrl() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
  if (!url) return "";
  return stripChannelBinding(url);
}

function stripChannelBinding(url) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("channel_binding");
    if (parsed.searchParams.get("sslmode") === "require") {
      parsed.searchParams.set("sslmode", "verify-full");
    }
    return parsed.toString();
  } catch {
    return url.replace(/([?&])channel_binding=[^&]*&?/g, "$1").replace(/[?&]$/, "");
  }
}

export function getPool() {
  const connectionString = databaseUrl();
  if (!connectionString) {
    const error = new Error("DATABASE_URL is not set");
    error.code = "NO_DATABASE_URL";
    throw error;
  }
  if (!Pool) {
    throw new Error("PostgreSQL client is unavailable");
  }
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 1,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 15000,
    });
  }
  return pool;
}

export async function closePool() {
  if (!pool) return;
  const current = pool;
  pool = null;
  schemaReady = null;
  await current.end();
}

async function applySchema() {
  const client = getPool();
  await client.query(CREATE_TABLE);
  for (const column of EXTRA_COLUMNS) {
    await client.query(`ALTER TABLE tributes ADD COLUMN IF NOT EXISTS ${column}`);
  }
  await client.query(`UPDATE tributes SET created_at = "timestamp" WHERE created_at IS NULL`);
  await client.query(`ALTER TABLE tributes ALTER COLUMN created_at SET DEFAULT NOW()`);
  await client.query(`ALTER TABLE tributes ALTER COLUMN created_at SET NOT NULL`);
  await client.query(`
    UPDATE tributes
    SET qr_link = caring_bridge_url
    WHERE qr_link IS NULL
      AND caring_bridge_url IS NOT NULL
      AND btrim(caring_bridge_url) <> ''
  `);
  await client.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS tributes_photo_token_idx ON tributes (photo_token)`
  );
}

export function ensureTributesTable() {
  if (!schemaReady) {
    schemaReady = applySchema().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}
