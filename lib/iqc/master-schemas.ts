import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max).transform((s) => (s === "" ? null : s));

export const supplierSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  code: z.string().trim().min(1, "Code is required.").max(20).transform((s) => s.toUpperCase()),
  name: z.string().trim().min(1, "Name is required.").max(120),
  status: z.enum(["approved", "probation", "blocked"]),
  category: z
    .union([z.literal(""), z.enum(["local", "import", "subcont"])])
    .transform((v) => (v === "" ? null : v)),
  email: z
    .string()
    .trim()
    .refine((s) => s === "" || z.email().safeParse(s).success, "Email: enter a valid email or leave it empty.")
    .transform((s) => (s === "" ? null : s)),
  active: z.boolean(),
});

export const partSchema = z
  .object({
    id: z.coerce.number().int().positive().optional(),
    partNo: z.string().trim().min(1, "Part number is required.").max(40).transform((s) => s.toUpperCase()),
    name: z.string().trim().min(1, "Name is required.").max(120),
    category: optionalText(60),
    drawingNo: optionalText(40),
    drawingRev: optionalText(10),
    regulated: z.boolean(),
    templateId: z.union([z.literal(""), z.coerce.number().int().positive()]).transform((v) => (v === "" ? null : v)),
    inspectionType: z.enum(["sampling", "full", "none", "quick"]),
    active: z.boolean(),
  })
  .refine((p) => p.inspectionType === "none" || p.inspectionType === "quick" || p.templateId !== null, {
    message: "Choose an inspection template (or set inspection type to 'no inspection' or 'appearance & fitting only').",
    path: ["templateId"],
  });

export function firstError(issues: { message: string }[]): string {
  return issues[0]?.message ?? "Please check the form.";
}
