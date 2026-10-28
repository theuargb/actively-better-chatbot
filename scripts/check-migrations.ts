/**
 * Validates drizzle migration bookkeeping.
 *
 * Drizzle's pg migrator only applies migrations whose journal `when` is newer
 * than the newest one already recorded in the database, so a renumbered or
 * out-of-order migration is silently skipped on databases that ran its sibling.
 *
 *   pnpm tsx scripts/check-migrations.ts [--dir <migrations-dir>] [--base <git-ref>]
 *
 * --base compares against the journal at <git-ref> and fails if any migration
 * that exists there was changed, moved or removed.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

type JournalEntry = { idx: number; tag: string; when: number };
type Journal = { entries: JournalEntry[] };

const DEFAULT_DIR = "src/lib/db/migrations/pg";

const parseArgs = (argv: string[]) => {
  const args: { dir: string; base?: string } = { dir: DEFAULT_DIR };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dir") args.dir = argv[++i];
    else if (argv[i] === "--base") args.base = argv[++i];
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  return args;
};

export const checkJournal = (
  journal: Journal,
  files: { sql: Set<string>; snapshots: Set<string> },
): string[] => {
  const errors: string[] = [];
  journal.entries.forEach((entry, i) => {
    const prefix = String(entry.idx).padStart(4, "0");
    if (entry.idx !== i) {
      errors.push(`entry #${i} has idx ${entry.idx} (expected ${i})`);
    }
    if (!entry.tag.startsWith(`${prefix}_`)) {
      errors.push(
        `idx ${entry.idx}: tag "${entry.tag}" must start with ${prefix}_`,
      );
    }
    if (i > 0 && entry.when <= journal.entries[i - 1].when) {
      errors.push(
        `idx ${entry.idx}: when ${entry.when} is not newer than idx ${journal.entries[i - 1].idx} (${journal.entries[i - 1].when}); drizzle would skip it on databases that already ran a later migration`,
      );
    }
    if (!files.sql.has(entry.tag))
      errors.push(`idx ${entry.idx}: ${entry.tag}.sql is missing`);
    if (!files.snapshots.has(prefix)) {
      errors.push(`idx ${entry.idx}: meta/${prefix}_snapshot.json is missing`);
    }
  });
  const tags = new Set(journal.entries.map((e) => e.tag));
  for (const sql of files.sql) {
    if (!tags.has(sql)) errors.push(`${sql}.sql is not listed in the journal`);
  }
  return errors;
};

export const checkAgainstBase = (journal: Journal, base: Journal): string[] => {
  const errors: string[] = [];
  base.entries.forEach((b, i) => {
    const current = journal.entries[i];
    if (!current) {
      errors.push(`base migration ${b.tag} (idx ${b.idx}) was removed`);
    } else if (
      current.idx !== b.idx ||
      current.tag !== b.tag ||
      current.when !== b.when
    ) {
      errors.push(
        `base migration ${b.tag} (when ${b.when}) was changed or moved; position ${i} is now ${current.tag} (when ${current.when})`,
      );
    }
  });
  return errors;
};

const main = () => {
  const { dir, base } = parseArgs(process.argv.slice(2));
  const journalPath = join(dir, "meta", "_journal.json");
  const journal: Journal = JSON.parse(readFileSync(journalPath, "utf8"));

  const files = {
    sql: new Set(
      readdirSync(dir)
        .filter((f) => f.endsWith(".sql"))
        .map((f) => f.slice(0, -".sql".length)),
    ),
    snapshots: new Set(
      existsSync(join(dir, "meta"))
        ? readdirSync(join(dir, "meta"))
            .filter((f) => f.endsWith("_snapshot.json"))
            .map((f) => f.slice(0, 4))
        : [],
    ),
  };

  const errors = checkJournal(journal, files);

  if (base) {
    let baseJournal: Journal | undefined;
    try {
      baseJournal = JSON.parse(
        execFileSync(
          "git",
          ["show", `${base}:${DEFAULT_DIR}/meta/_journal.json`],
          { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
        ),
      );
    } catch {
      console.warn(
        `warning: no journal at ${base}; skipping --base comparison`,
      );
    }
    if (baseJournal) errors.push(...checkAgainstBase(journal, baseJournal));
  }

  if (errors.length) {
    console.error("Migration check failed:");
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  console.log(`migrations OK (${journal.entries.length} entries)`);
};

main();
