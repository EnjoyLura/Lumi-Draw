const palettes = [
  ["#5b9fe8", "#62c9b7", "#f6b28f"],
  ["#8b7cf6", "#63c6f2", "#ffe083"],
  ["#ff7f73", "#ffc766", "#74d4b3"],
  ["#6f8ff2", "#b797f4", "#f8a6c2"],
  ["#3b82c4", "#9de2d4", "#f7d889"],
  ["#2f4568", "#688cc8", "#f4b6a0"]
];

function hashSeed(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function mockImage(seed: string, width = 300, height = 300) {
  const hash = hashSeed(seed);
  const [a, b, c] = palettes[hash % palettes.length];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="${a}"/>
          <stop offset="0.55" stop-color="${b}"/>
          <stop offset="1" stop-color="${c}"/>
        </linearGradient>
        <radialGradient id="glow" cx="30%" cy="25%" r="70%">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0.78"/>
          <stop offset="0.45" stop-color="#ffffff" stop-opacity="0.18"/>
          <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <circle cx="${(hash % width) || width / 2}" cy="${height * 0.22}" r="${Math.max(width, height) * 0.28}" fill="url(#glow)"/>
      <path d="M0 ${height * 0.72} C ${width * 0.24} ${height * 0.56}, ${width * 0.4} ${height * 0.9}, ${width} ${height * 0.62} L ${width} ${height} L 0 ${height} Z" fill="#0f1f3a" opacity="0.2"/>
      <path d="M0 ${height * 0.82} C ${width * 0.26} ${height * 0.7}, ${width * 0.55} ${height * 0.98}, ${width} ${height * 0.76} L ${width} ${height} L 0 ${height} Z" fill="#ffffff" opacity="0.2"/>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
