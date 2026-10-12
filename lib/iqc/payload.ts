import { z } from "zod";

// What the inspection form sends on every autosave. Server Actions can be
// called by anyone, so everything is checked again on the server.

const text = (max: number) => z.string().trim().max(max);

export const draftSchema = z.object({
  header: z.object({
    poNo: text(40),
    doNo: text(40),
    lotNo: text(40),
    qtyReceived: z.number().int().min(1).max(10_000_000),
    receivedAt: z.iso.datetime({ offset: true }),
    instrument: text(80),
  }),
  checks: z
    .array(z.object({ itemId: z.number().int().positive(), result: z.enum(["ok", "ng", "na"]), comment: text(500) }))
    .max(500),
  readings: z
    .array(z.object({ characteristicId: z.number().int().positive(), values: z.array(z.number().finite()).max(500) }))
    .max(200),
  defects: z
    .array(
      z.object({
        defectClass: z.enum(["critical", "major", "minor"]),
        found: z.number().int().min(0).nullable(),
        description: text(500),
      }),
    )
    .length(3),
  sectionNotes: z.record(z.string().max(80), text(500)),
});

export type DraftPayload = z.infer<typeof draftSchema>;
