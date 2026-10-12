import { describe, expect, it } from "vitest";
import { parseCredentials, parseId } from "./validation";

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
