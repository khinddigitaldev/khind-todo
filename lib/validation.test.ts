import { describe, expect, it } from "vitest";
import { MAX_TITLE_LENGTH, parseCredentials, parseId, parseTitle } from "./validation";

describe("parseId", () => {
  it("accepts a positive whole number sent as text", () => {
    expect(parseId("42")).toBe(42);
  });

  it.each([null, "", "abc", "0", "-3", "1.5", "1e3", " 7 "])("rejects %j", (raw) => {
    expect(() => parseId(raw)).toThrow("Invalid todo id");
  });
});

describe("parseTitle", () => {
  it("accepts a normal title and trims spaces", () => {
    expect(parseTitle("  Buy milk  ")).toEqual({ ok: true, value: "Buy milk" });
  });

  it("rejects an empty or blank title", () => {
    expect(parseTitle("")).toEqual({ ok: false, error: "Please type a todo first." });
    expect(parseTitle("   ")).toEqual({ ok: false, error: "Please type a todo first." });
  });

  it("rejects a missing value (form field not sent)", () => {
    expect(parseTitle(null)).toEqual({ ok: false, error: "Please type a todo first." });
  });

  it("accepts exactly the maximum length", () => {
    const title = "a".repeat(MAX_TITLE_LENGTH);
    expect(parseTitle(title)).toEqual({ ok: true, value: title });
  });

  it("rejects a title that is too long", () => {
    expect(parseTitle("a".repeat(MAX_TITLE_LENGTH + 1))).toEqual({
      ok: false,
      error: `Keep it under ${MAX_TITLE_LENGTH} characters.`,
    });
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
