// Reads the two Supabase settings and fails with a clear message when one is
// missing — the most common beginner mistake.

const NAMES = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const;

type SupabaseEnv = Partial<Record<(typeof NAMES)[number], string>>;

export function readSupabaseEnv(env: SupabaseEnv): { url: string; key: string } {
  const missing = NAMES.filter((name) => !env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing ${missing.join(", ")}. ` +
        "Locally: copy .env.example to .env.local and fill it in. " +
        "On Vercel: add them under Project → Settings → Environment Variables, then redeploy.",
    );
  }
  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    key: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!.trim(),
  };
}

export function supabaseEnv() {
  // Next.js only fills in NEXT_PUBLIC_* values when they are written out
  // in full like this, so don't pass `process.env` itself.
  return readSupabaseEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
