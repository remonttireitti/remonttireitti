/** Poista JSON.stringify:stä kaatuvat arvot (BigInt, NaN). */
export function jsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_, v) => {
      if (typeof v === "bigint") return v.toString();
      if (typeof v === "number" && !Number.isFinite(v)) return null;
      return v;
    }),
  ) as T;
}
