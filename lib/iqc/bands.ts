export type BandInput = { lotMin: number; lotMax: number | null; sampleNormal: number | null; sampleTightened: number | null };

// Same coverage rules the database relies on in sample_size_for: every lot
// size from 1 upwards must fall in exactly one band.
export function validateBands(bands: BandInput[]): string[] {
  if (bands.length === 0) return ["Add at least one band."];
  const errors: string[] = [];
  const sorted = [...bands].sort((a, b) => a.lotMin - b.lotMin);
  if (sorted[0].lotMin !== 1) errors.push("The first band must start at 1.");
  sorted.forEach((band, i) => {
    const n = i + 1;
    if (band.lotMax !== null && band.lotMax < band.lotMin) errors.push(`Band ${n}: 'to' is smaller than 'from'.`);
    if (band.sampleNormal !== null && band.sampleTightened !== null && band.sampleTightened < band.sampleNormal) {
      errors.push(`Band ${n}: tightened sample (${band.sampleTightened}) must be at least the normal sample (${band.sampleNormal}).`);
    }
    const next = sorted[i + 1];
    if (!next) return;
    if (band.lotMax === null) {
      errors.push(`Band ${n} has no upper limit, so it must be the last band.`);
    } else if (next.lotMin > band.lotMax + 1) {
      errors.push(`Gap: no band covers lot sizes ${band.lotMax + 1} to ${next.lotMin - 1}.`);
    } else if (next.lotMin <= band.lotMax) {
      errors.push(`Overlap: lot sizes ${next.lotMin} to ${band.lotMax} are in two bands.`);
    }
  });
  if (sorted[sorted.length - 1].lotMax !== null) errors.push("The last band must have no upper limit (leave 'to' empty).");
  return errors;
}
