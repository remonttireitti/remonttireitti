import { readFileSync } from "fs";
import pg from "pg";

const sql = readFileSync(
  new URL("../supabase/migrations/20260615100000_hubs.sql", import.meta.url),
  "utf8",
);

const client = new pg.Client({
  host: "aws-0-eu-west-1.pooler.supabase.com",
  port: 5432,
  user: "postgres.vgxjobyfbpzriofcbcis",
  password: "26061977Paide!",
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

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
