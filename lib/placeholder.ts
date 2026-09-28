function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(value: string, maxChars: number): string[] {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

export function productPlaceholder(name: string): string {
  const lines = wrapText(name, 28);
  const texts = lines
    .map(
      (line, i) =>
        `<text x="500" y="${375 + (i - (lines.length - 1) / 2) * 52}" font-family="monospace" font-size="36" fill="#767676" text-anchor="middle">${escapeXml(line)}</text>`
    )
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="750" viewBox="0 0 1000 750"><rect width="1000" height="750" fill="#EDEDED"/>${texts}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
