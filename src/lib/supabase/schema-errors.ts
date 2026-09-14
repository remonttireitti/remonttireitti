/** PostgREST / Postgres: sarake puuttuu (migraatio ajamatta). */
export function isMissingSchemaColumnError(error: {
  code?: string;
  message?: string;
} | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST204" ||
    (msg.includes("column") && msg.includes("does not exist")) ||
    (msg.includes("could not find") && msg.includes("column"))
  );
}
