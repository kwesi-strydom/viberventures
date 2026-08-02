// ============================================================
// SCHEMA SNIPPET — add these tables to your shared/schema.ts
// (only the parts needed for the Competitions feature)
// ============================================================
import { pgTable, text, integer, timestamp, uuid, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- Competitions table ---
export const competitions = pgTable("competitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  startDateDisplay: text("start_date_display"),
  endDateDisplay: text("end_date_display"),
  prize: text("prize").notNull(),
  status: text("status").notNull().default("upcoming"), // upcoming | active | completed
  participantCount: integer("participant_count").default(0).notNull(),
  thumbnailUrl: text("thumbnail_url"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// --- Games table (only competition-relevant fields shown) ---
// If you already have a games table, just make sure it has a
// competition_id column referencing competitions.id
export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  thumbnail_url: text("thumbnail_url").notNull(),
  game_url: text("game_url").notNull(),
  creator: text("creator"),
  submitted_by: text("submitted_by"),
  competition_id: uuid("competition_id").references(() => competitions.id, { onDelete: "set null" }),
  age_days: integer("age_days").default(0).notNull(),
  play_count: integer("play_count").default(0).notNull(),
  earnings_vbr: decimal("earnings_vbr", { precision: 18, scale: 6 }).default("0").notNull(),
});

// --- Types & insert schemas ---
export const insertCompetitionSchema = createInsertSchema(competitions).omit({
  id: true,
  created_at: true,
  participantCount: true,
}).extend({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export type Competition = typeof competitions.$inferSelect;
export type InsertCompetition = z.infer<typeof insertCompetitionSchema>;
export type Game = typeof games.$inferSelect;
