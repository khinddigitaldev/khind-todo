import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("writes a header and rows in column order", () =>
    expect(toCsv([{ b: 2, a: 1 }], ["a", "b"])).toBe("a,b\r\n1,2\r\n"));
  it("quotes commas, quotes and new lines", () =>
    expect(toCsv([{ a: 'He said "hi", ok\nbye' }], ["a"])).toBe('a\r\n"He said ""hi"", ok\nbye"\r\n'));
  it("writes null and undefined as empty", () => expect(toCsv([{ a: null }], ["a", "b"])).toBe("a,b\r\n,\r\n"));
  it("neutralises spreadsheet formulas", () => expect(toCsv([{ a: "=SUM(A1)" }], ["a"])).toBe("a\r\n'=SUM(A1)\r\n"));
  it("leaves negative numbers alone", () => expect(toCsv([{ a: -5 }], ["a"])).toBe("a\r\n-5\r\n"));
  it("serialises arrays and objects as JSON", () =>
    expect(toCsv([{ a: [1, 2] }], ["a"])).toBe('a\r\n"[1,2]"\r\n'));
});
