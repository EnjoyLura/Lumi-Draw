import { readFileSync } from "node:fs";

export function stripUniConditionalBlocks(source, platform = "") {
  const lines = source.split(/\r?\n/);
  const stack = [];
  const output = [];

  for (const line of lines) {
    const ifdef = line.match(/^\s*\/\/\s*#ifdef\s+(.+?)\s*$/);
    if (ifdef) {
      stack.push(ifdef[1].split(/\s*\|\|\s*/).includes(platform));
      continue;
    }

    if (/^\s*\/\/\s*#endif\s*$/.test(line)) {
      stack.pop();
      continue;
    }

    if (stack.includes(false)) continue;
    output.push(line);
  }

  return output.join("\n");
}

export function readUniJson(file, options = {}) {
  return JSON.parse(stripUniConditionalBlocks(readFileSync(file, "utf8"), options.platform || ""));
}
