import { NextResponse } from "next/server";
import { findGame } from "../../../../lib/games";

export async function GET(_request, { params }) {
  const { id } = await params;
  const game = findGame(id);
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });
  return NextResponse.json({ data: game, source: "mock" });
}
