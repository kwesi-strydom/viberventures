// ============================================================
// BACKEND SNIPPET — Express routes + storage methods
// ============================================================

// ---------- 1) Add to server/routes.ts ----------
/*
import { insertCompetitionSchema } from "@shared/schema";

app.get("/api/competitions", async (req, res) => {
  try {
    const competitions = await storage.getAllCompetitions();
    res.json(competitions);
  } catch (error) {
    console.error("Error fetching competitions:", error);
    res.status(500).json({ error: "Failed to fetch competitions" });
  }
});

app.get("/api/competitions/:id", async (req, res) => {
  try {
    const competition = await storage.getCompetitionById(req.params.id);
    if (!competition) return res.status(404).json({ error: "Competition not found" });
    res.json(competition);
  } catch (error) {
    console.error("Error fetching competition:", error);
    res.status(500).json({ error: "Failed to fetch competition" });
  }
});

app.get("/api/competitions/:id/games", async (req, res) => {
  try {
    const games = await storage.getGamesByCompetition(req.params.id);
    res.json(games);
  } catch (error) {
    console.error("Error fetching competition games:", error);
    res.status(500).json({ error: "Failed to fetch competition games" });
  }
});

app.post("/api/competitions", async (req, res) => {
  try {
    const competitionData = insertCompetitionSchema.parse(req.body);
    const competition = await storage.createCompetition(competitionData);
    res.status(201).json(competition);
  } catch (error) {
    console.error("Error creating competition:", error);
    res.status(500).json({ error: "Failed to create competition" });
  }
});
*/

// ---------- 2) Add to your IStorage interface ----------
/*
getAllCompetitions(): Promise<Competition[]>;
getCompetitionById(id: string): Promise<Competition | undefined>;
createCompetition(competition: InsertCompetition): Promise<Competition>;
getGamesByCompetition(competitionId: string): Promise<Array<Game & { avg_rating: number; rating_count: number }>>;
*/

// ---------- 3) DatabaseStorage implementation (Drizzle) ----------
/*
import { db } from "./db";
import { competitions, games, ratings } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

async getAllCompetitions(): Promise<Competition[]> {
  return db.select().from(competitions).orderBy(desc(competitions.created_at));
}

async getCompetitionById(id: string): Promise<Competition | undefined> {
  const result = await db.select().from(competitions).where(eq(competitions.id, id)).limit(1);
  return result[0];
}

async createCompetition(insertCompetition: InsertCompetition): Promise<Competition> {
  const result = await db.insert(competitions).values(insertCompetition).returning();
  return result[0];
}

async getGamesByCompetition(competitionId: string) {
  // Join games with their ratings to compute avg_rating + rating_count.
  // If you don't have a ratings table, just return games with avg_rating: 0, rating_count: 0
  const result = await db
    .select({
      id: games.id,
      created_at: games.created_at,
      title: games.title,
      description: games.description,
      thumbnail_url: games.thumbnail_url,
      game_url: games.game_url,
      creator: games.creator,
      submitted_by: games.submitted_by,
      competition_id: games.competition_id,
      age_days: games.age_days,
      play_count: games.play_count,
      earnings_vbr: games.earnings_vbr,
      avg_rating: sql<number>`COALESCE(AVG(${ratings.rating}), 0)`.as("avg_rating"),
      rating_count: sql<number>`COUNT(${ratings.id})`.as("rating_count"),
    })
    .from(games)
    .leftJoin(ratings, eq(ratings.game_id, games.id))
    .where(eq(games.competition_id, competitionId))
    .groupBy(games.id);
  return result as any;
}
*/
