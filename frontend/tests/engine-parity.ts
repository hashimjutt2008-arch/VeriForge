import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createCleaner } from "../lib/engine/cleaner";
import { parseFile } from "../lib/engine/files";
import { createExport, exportColumns } from "../lib/engine/exports";
import { defaultOptions, type CleaningOptions } from "../lib/cleaning-options";
import rules from "../lib/engine/rules.json";
import type { ResultRecord } from "../lib/types";
import type { FileMetadata } from "../lib/services/contracts";
const golden = JSON.parse(readFileSync("tests/parity-golden.json", "utf8")) as {
  cases: {
    values: unknown[];
    options: CleaningOptions;
    records: ResultRecord[];
  }[];
  files: {
    filename: string;
    metadata: FileMetadata;
    records: ResultRecord[];
  }[];
};
import Papa from "papaparse";
import { read, utils } from "xlsx";
import type { ExportType } from "../lib/services/contracts";

async function main() {
  let count = 0;
  for (const [i, fixture] of golden.cases.entries()) {
    const clean = createCleaner(fixture.options as CleaningOptions);
    const actual = fixture.values.map(clean);
    assert.deepEqual(actual, fixture.records, `Python parity case ${i}`);
    count += actual.length;
  }
  for (const [name, data] of Object.entries(rules))
    assert.deepEqual(
      data,
      JSON.parse(
        readFileSync(`../rules/${name}.json`, "utf8").replace(/^\uFEFF/, ""),
      ),
      `Rule data drift: ${name}`,
    );
  for (const fixture of golden.files) {
    const parsed = await parseFile(
      new File(
        [readFileSync(`../tests/fixtures/${fixture.filename}`)],
        fixture.filename,
      ),
    );
    assert.deepEqual(
      parsed.metadata,
      fixture.metadata,
      fixture.filename + " metadata",
    );
    const records = parsed.rows
      .map((row) => row[parsed.metadata.suggested_column!] ?? "")
      .map(createCleaner());
    assert.deepEqual(records, fixture.records, fixture.filename + " cleaning");
    for (const kind of Object.keys(exportColumns) as ExportType[]) {
      const csv = Papa.parse<string[]>(
        await createExport(records, kind, "csv").text(),
      ).data;
      const workbook = read(
        await createExport(records, kind, "xlsx").arrayBuffer(),
        { type: "array" },
      );
      const xlsx = utils.sheet_to_json<string[]>(workbook.Sheets.VeriForge, {
        header: 1,
        defval: "",
      });
      assert.deepEqual(
        csv.slice(0, -1),
        xlsx,
        kind + " CSV/XLSX schema and values",
      );
    }
  }
  const rows = ["=SUM(1,2)", " +1+2", "@SUM(1)", "x@y.com", "x@y.com"].map(
    createCleaner(),
  );
  const csv = await createExport(rows, "full", "csv").text();
  assert(csv.includes("'=SUM(1,2)"));
  assert(csv.includes("' +1+2"));
  const book = read(await createExport(rows, "full", "xlsx").arrayBuffer());
  assert.equal(book.Sheets.VeriForge.A2.t, "s");
  assert.equal(book.Sheets.VeriForge.A2.f, undefined);
  assert.equal(book.Sheets.VeriForge.A2.v, "=SUM(1,2)");
  const parse = (text: string, name = "test.csv", header?: boolean) =>
    parseFile(new File([text], name), header);
  assert.equal(
    (await parse("Name;Email\nA;a@corp.com\nB;b@corp.com\n")).metadata
      .suggested_column,
    1,
  );
  assert.deepEqual((await parse('Email\n"a@corp.com"\n\n')).rows, [
    ["a@corp.com"],
    [""],
  ]);
  assert.equal(
    (await parse("Label,email\nA,a@corp.com\n", "test.csv", false)).rows.length,
    2,
  );
  assert.equal(
    (await parse("a@corp.com\r\nb@corp.com\r\n", "test.txt")).rows.length,
    2,
  );
  await assert.rejects(() => parse('Email\n"unclosed'), /quotes/);
  await assert.rejects(() => parse("x".repeat(4097)), /4096/);
  await assert.rejects(
    () => parse("a@x.com\n".repeat(100001), "test.txt"),
    /100,000/,
  );
  assert.throws(
    () => createCleaner({ ...defaultOptions, company_domain_limit: 0 }),
    /between/,
  );
  console.log(
    `PASS: ${count} Python-equivalent records, rules parity, CSV/TXT/XLSX metadata and values, six export schemas, formula safety and input limits.`,
  );
}
void main();
