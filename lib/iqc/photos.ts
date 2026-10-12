export const PHOTO_MAX_BYTES = 204_800;
export const MAX_PER_ITEM = 3;
export const MAX_PER_INSPECTION = 6;
const MIME = ["image/jpeg", "image/webp"];

// Free-plan storage is small, so photos are evidence for problems only.
export function photoAllowed(input: {
  itemResult: "ok" | "ng" | "na" | null;
  lotVerdict: "accept" | "reject" | "incomplete";
  forItem: boolean;
  countForItem: number;
  countTotal: number;
  bytes: number;
  mime: string;
}): string | null {
  if (!MIME.includes(input.mime)) return "Only JPEG or WebP photos are allowed.";
  if (input.bytes > PHOTO_MAX_BYTES) return "Photo is larger than 200 KB after compression.";
  if (input.forItem && input.itemResult !== "ng") return "Photos can only be added to NG items.";
  if (!input.forItem && input.lotVerdict !== "reject") return "Lot photos are only for rejected lots.";
  if (input.countTotal >= MAX_PER_INSPECTION) return `This inspection already has ${MAX_PER_INSPECTION} photos.`;
  if (input.forItem && input.countForItem >= MAX_PER_ITEM) return `This item already has ${MAX_PER_ITEM} photos.`;
  return null;
}
