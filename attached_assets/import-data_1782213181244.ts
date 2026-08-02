// ============================================================
// DATA IMPORTER — loads competitions-data.json into your DB
// ============================================================
// Run from your other session's project root with:
//   tsx competitions-export/import-data.ts
//
// Adjust the import paths below to match your project structure.
// ============================================================
import { readFileSync } from "fs";
import { db } from "../server/db.js";
import { competitions, games } from "../shared/schema.js";
import { sql } from "drizzle-orm";

interface ExportData {
  competitions: any[];
  games: Record<string, any[]>;
}

async function importData() {
  const data: ExportData = JSON.parse(
    readFileSync("competitions-export/competitions-data.json", "utf8")
  );

  console.log(`Importing ${data.competitions.length} competitions...`);

  for (const comp of data.competitions) {
    await db
      .insert(competitions)
      .values({
        id: comp.id,
        title: comp.title,
        description: comp.description,
        startDate: new Date(comp.startDate),
        endDate: new Date(comp.endDate),
        startDateDisplay: comp.startDateDisplay ?? null,
        endDateDisplay: comp.endDateDisplay ?? null,
        prize: comp.prize,
        status: comp.status,
        participantCount: comp.participantCount ?? 0,
        thumbnailUrl: comp.thumbnailUrl ?? null,
        created_at: new Date(comp.created_at),
      })
      .onConflictDoNothing();
    console.log(`  ✓ ${comp.title}`);
  }

  let gameCount = 0;
  for (const [competitionId, gameList] of Object.entries(data.games)) {
    for (const g of gameList) {
      await db
        .insert(games)
        .values({
          id: g.id,
          created_at: new Date(g.created_at),
          title: g.title,
          description: g.description,
          thumbnail_url: g.thumbnail_url,
          game_url: g.game_url,
          creator: g.creator ?? null,
          submitted_by: g.submitted_by ?? null,
          competition_id: competitionId,
          age_days: g.age_days ?? 0,
          play_count: g.play_count ?? 0,
          earnings_vbr: g.earnings_vbr ?? "0",
        })
        .onConflictDoNothing();
      gameCount++;
    }
  }

  console.log(`\n✅ Imported ${data.competitions.length} competitions and ${gameCount} games`);
  process.exit(0);
}

importData().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
