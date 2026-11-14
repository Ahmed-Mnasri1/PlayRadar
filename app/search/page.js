import { SearchExperience } from "./search-experience";
import { games } from "../../lib/games";

export const metadata = { title: "Rechercher des jeux — PlayRadar" };

export default async function SearchPage({ searchParams }) {
  const params = await searchParams;
  return <SearchExperience games={games} initialParams={params ?? {}} />;
}
