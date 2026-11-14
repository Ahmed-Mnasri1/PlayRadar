import { WishlistExperience } from "./wishlist-experience";
import { games } from "../../lib/games";

export const metadata = { title: "Ma liste — PlayRadar" };

export default function WishlistPage() {
  return <WishlistExperience games={games} />;
}
