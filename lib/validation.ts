// Small, pure checks for form input. They run on the server before
// anything is sent to Supabase, and they are unit tested in validation.test.ts.

export const MAX_TITLE_LENGTH = 200;
const MIN_PASSWORD_LENGTH = 6; // Supabase's default minimum

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

type FormValue = FormDataEntryValue | null;

function asText(value: FormValue): string {
  return typeof value === "string" ? value : "";
}

export function parseTitle(raw: FormValue): Parsed<string> {
  const title = asText(raw).trim();
  if (title.length === 0) {
    return { ok: false, error: "Please type a todo first." };
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return { ok: false, error: `Keep it under ${MAX_TITLE_LENGTH} characters.` };
  }
  return { ok: true, value: title };
}

// Todo ids arrive from hidden form fields as text. Anything other than a
// plain positive whole number means a tampered form, so we throw.
export function parseId(raw: FormValue): number {
  const text = asText(raw);
  if (!/^[1-9]\d*$/.test(text) || !Number.isSafeInteger(Number(text))) {
    throw new Error("Invalid todo id");
  }
  return Number(text);
}

export function parseCredentials(
  rawEmail: FormValue,
  rawPassword: FormValue,
): Parsed<{ email: string; password: string }> {
  const email = asText(rawEmail).trim();
  const password = asText(rawPassword);
  if (!email.includes("@")) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  return { ok: true, value: { email, password } };
}
