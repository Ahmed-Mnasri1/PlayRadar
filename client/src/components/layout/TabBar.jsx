import { NavLink } from "react-router-dom";
import Icon from "../Icon.jsx";

const ITEMS = [
  ["/", "Home", "house"],
  ["/browse", "Search", "search"],
  ["/changes", "Changes", "trending-down"],
  ["/wishlist", "My list", "bookmark"],
];

/** Bottom navigation shown on phones and small tablets (CSS decides when). */
export default function TabBar() {
  return (
    <nav className="tabbar" aria-label="Mobile navigation">
      {ITEMS.map(([to, label, ic]) => (
        <NavLink key={to} className="tabbar__item" to={to} end={to === "/"}>
          <Icon name={ic} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
