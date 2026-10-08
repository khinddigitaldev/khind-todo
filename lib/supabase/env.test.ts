import { describe, expect, it } from "vitest";
import { readSupabaseEnv } from "./env";

describe("readSupabaseEnv", () => {
  it("returns the URL and key when both are set", () => {
    expect(
      readSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_123",
      }),
    ).toEqual({ url: "https://abc.supabase.co", key: "sb_publishable_123" });
  });

  it("names every missing variable in a beginner-friendly error", () => {
    expect(() => readSupabaseEnv({})).toThrow(
      "Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  });

  it("treats blank values as missing", () => {
    expect(() =>
      readSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "  ",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_123",
      }),
    ).toThrow("Missing NEXT_PUBLIC_SUPABASE_URL");
  });

  it("points to .env.local and Vercel in the error", () => {
    expect(() => readSupabaseEnv({})).toThrow(/\.env\.local.*Vercel/);
  });
});
