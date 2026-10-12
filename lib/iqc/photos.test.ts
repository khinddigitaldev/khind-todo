import { describe, expect, it } from "vitest";
import { photoAllowed } from "./photos";

const ok = { itemResult: "ng" as const, lotVerdict: "incomplete" as const, forItem: true, countForItem: 0, countTotal: 0, bytes: 150_000, mime: "image/webp" };

describe("photoAllowed", () => {
  it("allows a photo on an NG item", () => expect(photoAllowed(ok)).toBeNull());
  it("refuses photos on OK items", () =>
    expect(photoAllowed({ ...ok, itemResult: "ok" })).toBe("Photos can only be added to NG items."));
  it("allows a lot photo only when the verdict is Reject", () => {
    expect(photoAllowed({ ...ok, forItem: false, itemResult: null, lotVerdict: "reject" })).toBeNull();
    expect(photoAllowed({ ...ok, forItem: false, itemResult: null, lotVerdict: "accept" })).toBe(
      "Lot photos are only for rejected lots.");
  });
  it("caps photos per item and per inspection", () => {
    expect(photoAllowed({ ...ok, countForItem: 3 })).toBe("This item already has 3 photos.");
    expect(photoAllowed({ ...ok, countTotal: 6 })).toBe("This inspection already has 6 photos.");
  });
  it("refuses files over 200 KB or of the wrong type", () => {
    expect(photoAllowed({ ...ok, bytes: 204_801 })).toBe("Photo is larger than 200 KB after compression.");
    expect(photoAllowed({ ...ok, mime: "image/png" })).toBe("Only JPEG or WebP photos are allowed.");
  });
});
