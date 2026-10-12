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

const numOrNull = z.number().finite().nullable();

export const templateVersionSchema = z
  .object({
    templateId: z.number().int().positive().nullable(),
    name: text(80),
    items: z.array(z.object({ section: z.string().trim().min(1).max(80), text: z.string().trim().min(1).max(300) })).min(1).max(300),
    characteristics: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(120),
          nominal: numOrNull,
          min: numOrNull,
          max: numOrNull,
          unit: text(10),
          defectClass: z.enum(["critical", "major", "minor"]),
        }),
      )
      .max(100),
  })
  .refine((t) => t.templateId !== null || t.name.length > 0, { message: "Give the new template a name.", path: ["name"] })
  .refine((t) => t.characteristics.every((c) => c.min === null || c.max === null || c.min <= c.max), {
    message: "A dimension has min greater than max.",
    path: ["characteristics"],
  });
export type TemplateVersionPayload = z.infer<typeof templateVersionSchema>;

const sampleSize = z.number().int().min(1).nullable();
export const samplingSchema = z.object({
  bands: z
    .array(z.object({ lotMin: z.number().int().min(1), lotMax: z.number().int().min(1).nullable(), sampleNormal: sampleSize, sampleTightened: sampleSize }))
    .min(1)
    .max(30),
  acceptance: z.object({
    critical: z.number().int().min(0).max(50),
    major: z.number().int().min(0).max(50),
    minor: z.number().int().min(0).max(50),
  }),
});
export type SamplingPayload = z.infer<typeof samplingSchema>;

export const newInspectionSchema = z.object({
  supplierId: z.coerce.number({ error: "Choose a supplier." }).int().positive("Choose a supplier."),
  partId: z.coerce.number({ error: "Choose a part." }).int().positive("Choose a part."),
  qty: z.coerce.number().int("Quantity must be a whole number.").min(1, "Quantity must be at least 1.").max(10_000_000),
  receivedAt: z.iso.datetime({ offset: true, error: "Enter when the goods were received." }),
  po: text(40),
  do: text(40),
  lot: text(40),
});
