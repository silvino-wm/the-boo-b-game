import { env } from "cloudflare:workers";

export type ScoreRow = {
  id: number;
  player_name: string;
  score: number;
  level_reached: number;
  created_at: string;
};

function database() {
  if (!env.DB) throw new Error("Leaderboard database unavailable");
  return env.DB;
}

export async function topScores(limit = 10) {
  const result = await database().prepare(
    `SELECT id, player_name, score, level_reached, created_at
     FROM scores
     ORDER BY score DESC, level_reached DESC, created_at ASC, id ASC
     LIMIT ?`
  ).bind(limit).all<ScoreRow>();
  return result.results;
}

export async function createScore(input: { runId:string; playerName:string; score:number; levelReached:number }) {
  return database().prepare(
    `INSERT INTO scores (run_id, player_name, score, level_reached)
     VALUES (?, ?, ?, ?)
     RETURNING id, player_name, score, level_reached, created_at`
  ).bind(input.runId, input.playerName, input.score, input.levelReached).first<ScoreRow>();
}
