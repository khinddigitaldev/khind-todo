// Runs the pgTAP tests in supabase/tests against the LINKED cloud project
// without Docker. Each file is split into statements and executed inside
// tests.run_sql(), which collects the TAP lines and then forces a rollback,
// so nothing a test inserts is kept.
//
// Usage: node scripts/db-test.mjs [file-filter]

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const RUNNER = String.raw`
create schema if not exists tests;
revoke all on schema tests from public, anon, authenticated;
create or replace function tests.run_sql(stmts text[]) returns setof text
language plpgsql as $run$
declare
  s text;
  rec record;
  v text;
  lines text[] := '{}';
begin
  begin
    execute 'set local search_path = public, extensions';
    foreach s in array stmts loop
      if s ~* '^\s*(select|with|values)\M' then
        for rec in execute s loop
          select value into v from json_each_text(row_to_json(rec)) limit 1;
          if v ~ '^(ok|not ok|1\.\.|#)' then lines := lines || v; end if;
        end loop;
      else
        execute s;
      end if;
    end loop;
    raise exception using errcode = 'P0123', message = 'tests.rollback';
  exception
    when sqlstate 'P0123' then null;
    when others then lines := lines || ('not ok - runner error: ' || sqlerrm || ' [' || sqlstate || '] in: ' || left(s, 120));
  end;
  return query select unnest(lines);
end $run$;
`;

// Split SQL into statements, respecting quotes, dollar quotes and comments.
export function splitSql(sql) {
  const out = [];
  let cur = "";
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    const rest = sql.slice(i);
    if (rest.startsWith("--")) {
      const end = sql.indexOf("\n", i);
      i = end === -1 ? sql.length : end + 1;
      cur += "\n";
      continue;
    }
    if (rest.startsWith("/*")) {
      const end = sql.indexOf("*/", i + 2);
      i = end === -1 ? sql.length : end + 2;
      continue;
    }
    if (c === "'") {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === "'" && sql[j + 1] === "'") j += 2;
        else if (sql[j] === "'") break;
        else j++;
      }
      cur += sql.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    const tag = rest.match(/^\$[A-Za-z_]*\$/);
    if (tag) {
      const end = sql.indexOf(tag[0], i + tag[0].length);
      const stop = end === -1 ? sql.length : end + tag[0].length;
      cur += sql.slice(i, stop);
      i = stop;
      continue;
    }
    if (c === ";") {
      if (cur.trim()) out.push(cur.trim());
      cur = "";
      i++;
      continue;
    }
    cur += c;
    i++;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function runQuery(sql) {
  const dir = mkdtempSync(join(tmpdir(), "dbtest-"));
  const file = join(dir, "q.sql");
  writeFileSync(file, sql);
  const r = spawnSync("npx", ["supabase", "db", "query", "--linked", "-f", file], { encoding: "utf8", shell: true });
  const text = `${r.stdout ?? ""}`;
  const start = text.indexOf("{");
  if (start === -1) throw new Error(`No JSON from supabase db query:\n${text}\n${r.stderr ?? ""}`);
  return JSON.parse(text.slice(start));
}

const filter = process.argv[2] ?? "";
const files = readdirSync("supabase/tests").filter((f) => f.endsWith(".test.sql") && f.includes(filter)).sort();
let failedFiles = 0;

for (const f of files) {
  const stmts = splitSql(readFileSync(join("supabase/tests", f), "utf8")).filter(
    (s) => !/^(begin|rollback|commit)$/i.test(s),
  );
  const tag = "$stmt_" + Math.random().toString(36).slice(2, 8) + "$";
  const array = `array[${stmts.map((s) => `${tag}${s}${tag}`).join(",\n")}]::text[]`;
  let lines;
  try {
    const res = runQuery(`${RUNNER}\nselect line from tests.run_sql(${array}) as t(line);`);
    if (res.error) throw new Error(JSON.stringify(res.error));
    lines = (res.rows ?? []).flatMap((r) => String(r.line).split("\n"));
  } catch (e) {
    lines = [`not ok - could not run: ${e.message}`];
  }
  const planLine = lines.find((l) => /^1\.\.\d+/.test(l));
  const planned = planLine ? Number(planLine.slice(3)) : null;
  const results = lines.filter((l) => /^(ok|not ok)\b/.test(l));
  const failures = results.filter((l) => l.startsWith("not ok"));
  const planMismatch = planned !== null && planned !== results.length;
  const ok = failures.length === 0 && !planMismatch && planned !== null;
  console.log(`${f} .. ${ok ? "ok" : "FAILED"} (${results.length - failures.length}/${planned ?? "?"})`);
  if (!ok) {
    failedFiles++;
    for (const l of lines) if (l.startsWith("not ok") || l.startsWith("#")) console.log(`    ${l}`);
    if (planMismatch) console.log(`    # planned ${planned} tests but ran ${results.length}`);
  }
}

console.log(failedFiles === 0 ? `All tests successful (${files.length} files).` : `${failedFiles} of ${files.length} files failed.`);
process.exit(failedFiles === 0 ? 0 : 1);
