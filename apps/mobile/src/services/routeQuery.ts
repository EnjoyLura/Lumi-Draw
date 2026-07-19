function decodeQueryPart(value: string) {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

export function parseQueryString(queryString: string) {
  const query: Record<string, string> = {};
  const source = queryString.replace(/^\?/, "").split("#", 1)[0];
  if (!source) return query;

  source.split("&").forEach((entry) => {
    if (!entry) return;
    const separator = entry.indexOf("=");
    const rawKey = separator >= 0 ? entry.slice(0, separator) : entry;
    const rawValue = separator >= 0 ? entry.slice(separator + 1) : "";
    const key = decodeQueryPart(rawKey);
    if (key) query[key] = decodeQueryPart(rawValue);
  });

  return query;
}
