export function lýsaGildi(gildi: unknown): string {
  if (
    typeof gildi === "string" ||
    typeof gildi === "number" ||
    typeof gildi === "boolean" ||
    typeof gildi === "bigint" ||
    typeof gildi === "symbol"
  ) {
    return String(gildi);
  }

  if (gildi === null) {
    return "null";
  }

  try {
    const json = JSON.stringify(gildi);
    if (typeof json === "string") {
      return json;
    }
  } catch {
    return Object.prototype.toString.call(gildi);
  }

  return Object.prototype.toString.call(gildi);
}
