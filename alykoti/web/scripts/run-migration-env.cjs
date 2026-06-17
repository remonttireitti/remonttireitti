const { readFileSync } = require("fs");
const { Client } = require("pg");
const path = require("path");

const migration = process.argv[2] ?? "20260615120000_hub_metric_samples.sql";
const sql = readFileSync(
  path.join(__dirname, "../../supabase/migrations", migration),
  "utf8",
);

const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error("Set SUPABASE_DB_PASSWORD");
  process.exit(1);
}

const client = new Client({
  host: process.env.SUPABASE_DB_HOST ?? "aws-0-eu-west-1.pooler.supabase.com",
  port: Number(process.env.SUPABASE_DB_PORT ?? "5432"),
  user: process.env.SUPABASE_DB_USER ?? "postgres.vgxjobyfbpzriofcbcis",
  password,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

(async () => {
  await client.connect();
  try {
    await client.query(sql);
    console.log(`Migration OK: ${migration}`);
  } catch (e) {
    console.error("Migration error:", e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
