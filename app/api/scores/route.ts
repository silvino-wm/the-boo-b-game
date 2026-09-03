import { createScore, topScores } from "../../../db/scores";

export async function GET() {
  try {
    return Response.json({ scores: await topScores(10) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Leaderboard unavailable" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const runId = typeof body.runId === "string" ? body.runId.trim() : "";
    const playerName = typeof body.playerName === "string" ? body.playerName.trim().replace(/\s+/g, " ") : "";
    const score = Number(body.score);
    const levelReached = Number(body.levelReached);
    if (!/^[a-zA-Z0-9-]{20,64}$/.test(runId)) return Response.json({ error: "Invalid run" }, { status: 400 });
    if (playerName.length < 2 || playerName.length > 18) return Response.json({ error: "Name must have 2–18 characters" }, { status: 400 });
    if (!Number.isInteger(score) || score < 0 || score > 25000) return Response.json({ error: "Invalid score" }, { status: 400 });
    if (!Number.isInteger(levelReached) || levelReached < 1 || levelReached > 3) return Response.json({ error: "Invalid level" }, { status: 400 });
    const saved = await createScore({ runId, playerName, score, levelReached });
    return Response.json({ score: saved }, { status: 201 });
  } catch (error) {
    const duplicate = error instanceof Error && error.message.includes("UNIQUE constraint failed");
    return Response.json({ error: duplicate ? "This run was already submitted" : "Could not save score" }, { status: duplicate ? 409 : 500 });
  }
}
