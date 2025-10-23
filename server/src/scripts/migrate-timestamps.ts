import { db } from '../database';
import { promisify } from 'util';

// Typed promisified helpers
const all = promisify(db.all.bind(db)) as (
  sql: string,
  params?: any[]
) => Promise<{ id: number; timestamp: string }[]>;

const run = (sql: string, params?: any[]) =>
  new Promise<void>((resolve, reject) => {
    db.run(sql, params ?? [], function (err) {
      if (err) reject(err);
      else resolve();
    });
  });

const close = promisify(db.close.bind(db));

// Convert UTC timestamp to local (Swedish locale -> ISO-like)
function convertUtcToLocal(utcTimestamp: string): string {
  const date = new Date(utcTimestamp);
  return date.toLocaleString('sv-SE'); // 'YYYY-MM-DD HH:mm:ss'
}

(async () => {
  try {
    const rows = await all("SELECT id, timestamp FROM events");
    const updates = rows.filter(
      (r) => r.timestamp.endsWith('Z') || r.timestamp.includes('+') || r.timestamp.includes('-')
    );

    if (updates.length === 0) {
      console.log("No UTC timestamps found. Nothing to update.");
      return;
    }

    console.log(`Updating ${updates.length} rows...`);

    // Start a transaction
    await run("BEGIN TRANSACTION");

    for (const row of updates) {
      const localTimestamp = convertUtcToLocal(row.timestamp);
      await run("UPDATE events SET timestamp = ? WHERE id = ?", [localTimestamp, row.id]);
    }

    // Commit when done
    await run("COMMIT");

    console.log(`Updated ${updates.length} timestamps successfully.`);
  } catch (err) {
    console.error("Error during migration:", err);
    try {
      await run("ROLLBACK");
      console.log("Rolled back transaction due to error.");
    } catch (rollbackErr) {
      console.error("Error rolling back transaction:", rollbackErr);
    }
  } finally {
    await close();
    console.log("Database connection closed.");
  }
})();

