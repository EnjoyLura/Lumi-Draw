function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

/** 中转平台常把子结构二次序列化成字符串（如 data.resultJson），路径继续下钻时先解一层。 */
function unwrapJson(value: unknown) {
  if (typeof value !== "string") return value;
  const text = value.trim();
  if (!text.startsWith("{") && !text.startsWith("[")) return value;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return value;
  }
}

export function valuesAtPath(input: unknown, path: string) {
  if (!path.trim()) return [];
  let values: unknown[] = [input];
  for (const rawSegment of path.trim().split(".")) {
    const expandsArray = rawSegment.endsWith("[]");
    const segment = expandsArray ? rawSegment.slice(0, -2) : rawSegment;
    const next: unknown[] = [];
    for (const value of values) {
      const source = unwrapJson(value);
      const child = segment ? asRecord(source)?.[segment] : source;
      if (expandsArray) {
        if (Array.isArray(child)) next.push(...child);
      } else if (child !== undefined && child !== null) {
        next.push(child);
      }
    }
    values = next;
    if (!values.length) break;
  }
  return values;
}

export function firstStringAtPath(input: unknown, path: string) {
  const value = valuesAtPath(input, path).find((item) => typeof item === "string" || typeof item === "number");
  return value === undefined ? "" : String(value).trim();
}

export function firstNumberAtPath(input: unknown, path: string) {
  const value = valuesAtPath(input, path).find((item) => Number.isFinite(Number(item)));
  return value === undefined ? undefined : Number(value);
}

export function stringValuesAtPath(input: unknown, path: string) {
  return valuesAtPath(input, path)
    .filter((item) => typeof item === "string")
    .map((item) => String(item).trim())
    .filter(Boolean);
}
