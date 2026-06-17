const { readFileSync } = require("fs");
const { Client } = require("pg");
const path = require("path");

const sql = readFileSync(
  path.join(__dirname, "../supabase/migrations/20260615100000_hubs.sql"),
  "utf8",
);

const client = new Client({
  host: "aws-0-eu-west-1.pooler.supabase.com",
  port: 5432,
  user: "postgres.vgxjobyfbpzriofcbcis",
  password: "26061977Paide!",
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

(async () => {
  await client.connect();
  try {
    await client.query(sql);
    const { rows } = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('hubs', 'controllers', 'satellite_devices')
      ORDER BY 1
    `);
    console.log("Tables:", rows.map((r) => r.table_name).join(", "));
    console.log("Migration OK");
  } catch (e) {
    console.error("Migration error:", e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
