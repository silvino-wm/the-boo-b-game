import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";

export const scores = sqliteTable("scores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  runId: text("run_id").notNull(),
  playerName: text("player_name").notNull(),
  score: integer("score").notNull(),
  levelReached: integer("level_reached").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_scores_run_id").on(table.runId),
  index("idx_scores_ranking").on(table.score, table.levelReached, table.createdAt),
]);
