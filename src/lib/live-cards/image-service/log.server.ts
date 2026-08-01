// Logging of the Live Cards image service. Every line is prefixed so the
// section can be followed in the server logs independently of the greeting
// card generator.

const PREFIX = "[live-cards:image]";

export type LogFields = Record<string, unknown>;

function line(level: string, event: string, fields: LogFields): string {
  const body = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join(" ");
  return `${PREFIX} ${level} ${event}${body ? ` ${body}` : ""}`;
}

export function logInfo(event: string, fields: LogFields = {}): void {
  console.log(line("info", event, fields));
}

export function logWarn(event: string, fields: LogFields = {}): void {
  console.warn(line("warn", event, fields));
}

export function logError(event: string, fields: LogFields = {}): void {
  console.error(line("error", event, fields));
}