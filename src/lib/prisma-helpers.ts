export function asPrismaJson(value: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(value)) as never;
}
