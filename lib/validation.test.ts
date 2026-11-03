import { describe, expect, it } from "vitest";
import { parseCredentials, parseId, parseNewPassword, safeNextPath } from "./validation";

describe("parseId", () => {
  it("accepts a positive whole number sent as text", () => {
    expect(parseId("42")).toBe(42);
  });

  it.each([null, "", "abc", "0", "-3", "1.5", "1e3", " 7 "])("rejects %j", (raw) => {
    expect(() => parseId(raw)).toThrow("Invalid todo id");
  });
});

describe("parseCredentials", () => {
  it("accepts a valid email and password and trims the email", () => {
    expect(parseCredentials(" ali@example.com ", "secret123")).toEqual({
      ok: true,
      value: { email: "ali@example.com", password: "secret123" },
    });
  });

  it("rejects an email without @", () => {
    expect(parseCredentials("ali.example.com", "secret123")).toEqual({
      ok: false,
      error: "Please enter a valid email address.",
    });
  });

  it("rejects a missing email", () => {
    expect(parseCredentials(null, "secret123")).toEqual({
      ok: false,
      error: "Please enter a valid email address.",
    });
  });

  it("rejects a password shorter than 6 characters", () => {
    expect(parseCredentials("ali@example.com", "12345")).toEqual({
      ok: false,
      error: "Password must be at least 6 characters.",
    });
  });

  it("does not trim the password", () => {
    expect(parseCredentials("ali@example.com", " pass1 ")).toEqual({
      ok: true,
      value: { email: "ali@example.com", password: " pass1 " },
    });
  });
});

describe("parseNewPassword", () => {
  it("accepts two matching passwords of 8+ characters", () => {
    expect(parseNewPassword("longer-pass", "longer-pass")).toEqual({ ok: true, value: "longer-pass" });
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(parseNewPassword("short12", "short12")).toEqual({
      ok: false,
      error: "Password must be at least 8 characters.",
    });
  });

  it("rejects passwords that do not match", () => {
    expect(parseNewPassword("longer-pass", "longer-pas")).toEqual({
      ok: false,
      error: "The two passwords do not match.",
    });
  });

  it("rejects missing values", () => {
    expect(parseNewPassword(null, null).ok).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("keeps a path inside this site", () => {
    expect(safeNextPath("/account/password")).toBe("/account/password");
  });

  it.each([null, "", "account", "//evil.example.com", "/\\evil.example.com", "https://evil.example.com"])(
    "falls back to / for %j",
    (raw) => {
      expect(safeNextPath(raw)).toBe("/");
    },
  );
});
