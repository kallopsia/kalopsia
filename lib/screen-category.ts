// Deteksi kategori ukuran layar (14" / 15" / 16") dari teks spesifikasi.
// Modul murni — aman diimpor client maupun server, tanpa dependensi Supabase.

export type ScreenCategory = "14" | "15" | "16" | "belum";

export const SCREEN_CATEGORIES: ScreenCategory[] = ["14", "15", "16", "belum"];

export const SCREEN_CATEGORY_LABELS: Record<ScreenCategory, string> = {
  "14": '14"',
  "15": '15"',
  "16": '16"',
  belum: "Belum terkategori",
};

// Kata yang menandakan angka di dekatnya adalah ukuran layar.
const SCREEN_MARKERS = [
  "WUXGA", "WXGA", "WQXGA", "WQHD", "QHD", "FHD", "UHD",
  "OLED", "IPS", "LED", "TN",
  "INCH", "INCHES", '"', "”",
  "LAYAR", "DISPLAY", "SCREEN", "MONITOR", "PANEL",
  "2.5K", "2K", "3K", "4K", "5K",
];

// Sufiks yang boleh menempel langsung pada angka (14WUXGA, 15.6FHD, 14.0FHD+).
const GLUED_SUFFIX_RE =
  /^(?:WUXGA|WXGA|WQXGA|WQHD|QHD\+?|FHD\+?|UHD|OLED|IPS|LED|2\.5K|2K|3K|4K|5K|INCH|INCHES|LAYAR|DISPLAY|SCREEN|PANEL|"|”)/;

// Jendela pencarian marker di depan / di belakang kandidat angka.
const FORWARD_WINDOW = 40;
const BACKWARD_WINDOW = 24;

type Candidate = {
  size: number;
  start: number;
  end: number;
  glued: boolean;
  distance: number | null;
};

function mapSize(size: number): ScreenCategory {
  const rounded = Math.floor(size);
  if (rounded === 14) return "14";
  if (rounded === 15) return "15";
  if (rounded === 16) return "16";
  return "belum";
}

function findMarkerDistance(
  text: string,
  candidates: Candidate[],
  index: number
): number | null {
  const candidate = candidates[index];
  let best: number | null = null;

  const ahead = text.slice(candidate.end, candidate.end + FORWARD_WINDOW);
  const aheadRe = new RegExp(SCREEN_MARKERS.join("|"), "g");
  let aheadMatch: RegExpExecArray | null;
  while ((aheadMatch = aheadRe.exec(ahead)) !== null) {
    const markerStart = aheadMatch.index;
    // Marker milik kandidat lain (mis. "14" pada "VIVOBOOK 14 X1404 15.6FHD")
    // tidak boleh diklaim: batal bila ada kandidat lain di antaranya.
    const intrudes = candidates.some(
      (other, otherIndex) =>
        otherIndex !== index &&
        other.start >= candidate.end &&
        other.start < candidate.end + markerStart
    );
    if (!intrudes) {
      best = markerStart;
      break;
    }
  }
  if (best !== null) return best;

  const behindStart = Math.max(0, candidate.start - BACKWARD_WINDOW);
  const behind = text.slice(behindStart, candidate.start);
  const behindRe = new RegExp(SCREEN_MARKERS.join("|"), "g");
  let behindMatch: RegExpExecArray | null;
  while ((behindMatch = behindRe.exec(behind)) !== null) {
    const markerEnd = behindMatch.index + behindMatch[0].length;
    const intrudes = candidates.some(
      (other, otherIndex) =>
        otherIndex !== index &&
        other.end <= candidate.start &&
        other.end > behindStart + markerEnd
    );
    if (!intrudes) {
      const distance = candidate.start - (behindStart + markerEnd);
      best = best === null ? distance : Math.min(best, distance);
    }
  }
  return best;
}

export function detectScreenCategory(specText: string | null | undefined): ScreenCategory {
  const text = (specText || "").toUpperCase().replace(/\s+/g, " ");
  if (!text.trim()) return "belum";

  const candidates: Candidate[] = [];
  const sizeRe = /(\d{2}(?:\.\d)?)\s*("|”|INCH\b|INCHES\b)?/g;
  let match: RegExpExecArray | null;
  while ((match = sizeRe.exec(text)) !== null) {
    const raw = match[1];
    const start = match.index;
    const end = start + match[0].length;
    const prevChar = start > 0 ? text[start - 1] : "";
    const nextChar = end < text.length ? text[end] : "";
    // Simbol inch ("  / INCH) yang ikut tertangkap = marker ukuran yang pasti.
    const inlineMarker = Boolean(match[2]);

    // Bagian dari token model/processor ber-hyphen: i5-14500H, A715-59G-516S.
    if (prevChar === "-" || nextChar === "-") continue;
    // Angka tersambung huruf = coding, bukan ukuran: 14500H, 155H, 13420H.
    if (!inlineMarker && /[A-Z0-9]/.test(nextChar) && !GLUED_SUFFIX_RE.test(text.slice(end))) {
      continue;
    }
    if (/[A-Z0-9]/.test(prevChar)) continue;
    // 144HZ, 165HZ: refresh rate.
    if (/^\s*HZ\b/.test(text.slice(end))) continue;

    const size = Number(raw);
    const glued = inlineMarker || GLUED_SUFFIX_RE.test(text.slice(end));
    candidates.push({ size, start, end, glued, distance: glued ? 0 : null });
  }

  if (candidates.length === 0) return "belum";

  for (let i = 0; i < candidates.length; i += 1) {
    // Kandidat glued sudah punya marker menempel (distance 0).
    if (candidates[i].distance === null) {
      candidates[i].distance = findMarkerDistance(text, candidates, i);
    }
  }

  const valid = candidates.filter((candidate) => candidate.distance !== null);
  if (valid.length === 0) return "belum";

  valid.sort((a, b) => {
    const aGlued = a.glued ? 1 : 0;
    const bGlued = b.glued ? 1 : 0;
    if (aGlued !== bGlued) return bGlued - aGlued;
    if (a.distance !== b.distance) return (a.distance ?? 0) - (b.distance ?? 0);
    return a.start - b.start;
  });

  return mapSize(valid[0].size);
}
