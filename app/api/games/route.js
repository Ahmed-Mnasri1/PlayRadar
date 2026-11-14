import { NextResponse } from "next/server";
import { searchGames } from "../../../lib/games";

export function GET(request) {
  const params = new URL(request.url).searchParams;
  const games = searchGames({
    q: params.get("q") ?? "",
    platform: params.get("platform") ?? "",
    genre: params.get("genre") ?? "",
    maxPrice: params.get("maxPrice") ?? "",
    promosOnly: params.get("promos") === "1",
    sort: params.get("sort") ?? "relevance",
  });
  return NextResponse.json({ data: games, source: "mock", count: games.length });
}
