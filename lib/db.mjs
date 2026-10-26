import pg from "pg";

const Pool = pg.Pool || pg.default?.Pool;

let pool;
let schemaReady;
let trailSchemaReady;

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
  trailSchemaReady = null;
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

// photo_token and photo_bytes back photo_url, the same way tribute photos are stored.
const CREATE_TRAIL_CHECKINS = `
  CREATE TABLE IF NOT EXISTS trail_checkins (
    id BIGSERIAL PRIMARY KEY,
    user_name TEXT NOT NULL,
    photo_url TEXT NOT NULL,
    caption TEXT NOT NULL,
    ribbon_color TEXT NOT NULL,
    location_tag TEXT NOT NULL,
    reactions JSONB NOT NULL DEFAULT '{"hearts":0,"candles":0,"hugs":0}'::jsonb,
    is_approved BOOLEAN NOT NULL DEFAULT TRUE,
    is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    photo_token TEXT,
    photo_bytes BYTEA,
    photo_content_type TEXT,
    photo_filename TEXT
  )
`;

async function applyTrailSchema() {
  const client = getPool();
  await client.query(CREATE_TRAIL_CHECKINS);
  await client.query(`
    ALTER TABLE trail_checkins
    ALTER COLUMN reactions SET DEFAULT '{"hearts":0,"candles":0,"hugs":0}'::jsonb
  `);
  await client.query(`
    UPDATE trail_checkins
    SET reactions = '{"hearts":0,"candles":0,"hugs":0}'::jsonb
    WHERE reactions IS NULL
  `);
  await client.query(`ALTER TABLE trail_checkins ALTER COLUMN is_approved SET DEFAULT TRUE`);
  await client.query(`ALTER TABLE trail_checkins ALTER COLUMN is_flagged SET DEFAULT FALSE`);
  await client.query(`ALTER TABLE trail_checkins ALTER COLUMN created_at SET DEFAULT NOW()`);
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS trail_checkins_photo_token_idx
    ON trail_checkins (photo_token)
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS trail_checkins_public_feed_idx
    ON trail_checkins (created_at DESC, id DESC)
    WHERE is_approved = TRUE AND is_flagged = FALSE
  `);
}

export function ensureTrailCheckinsTable() {
  if (!trailSchemaReady) {
    trailSchemaReady = applyTrailSchema().catch((error) => {
      trailSchemaReady = null;
      throw error;
    });
  }
  return trailSchemaReady;
}
