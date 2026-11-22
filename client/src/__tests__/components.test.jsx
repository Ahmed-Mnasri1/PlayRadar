import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import GameCard from "../components/GameCard.jsx";
import ChangeList from "../components/ChangeList.jsx";
import Header from "../components/layout/Header.jsx";
import { AppContext } from "../context/AppContext.js";

afterEach(cleanup);
const withRouter = (ui, url = "/") =>
  render(
    <MemoryRouter initialEntries={[url]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {ui}
    </MemoryRouter>
  );

const game = {
  id: "elden-ring",
  title: "Elden Ring",
  genres: ["Action"],
  platforms: ["PC", "Xbox Series"],
  release: "2022-02-24",
  upcoming: false,
  img: { cover: "/c.webp", coverSm: "/c-sm.webp" },
  official: { price: 29.99, store: "steam" },
  base: 59.99,
  discount: 50,
  isLow: false,
  key: { price: 19.5 },
};

describe("GameCard", () => {
  it("shows the price, the regular price (for screen readers too), the discount and the key price", () => {
    withRouter(<GameCard g={game} />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/game/elden-ring");
    expect(within(link).getByRole("heading").textContent).toBe("Elden Ring");
    expect(link.textContent).toContain("$29.99");
    expect(link.textContent).toContain("Regular price $59.99");
    expect(link.textContent).toContain("−50%");
    expect(link.textContent).toContain("Keys $19.50");
    expect(link.textContent).toContain("Steam");
  });

  it("says Price TBA for a game without a price", () => {
    withRouter(<GameCard g={{ ...game, official: null, discount: 0, key: null, upcoming: true, release: "2027" }} />);
    expect(screen.getByRole("link").textContent).toContain("Price TBA");
    expect(screen.getByRole("link").textContent).toContain("Releases 2027");
  });
});

describe("ChangeList", () => {
  it("explains when nothing changed yet", () => {
    withRouter(<ChangeList changes={[]} />);
    expect(screen.getByRole("heading").textContent).toBe("No change detected yet");
  });

  it("lists a price drop with the old and the new price", () => {
    const change = {
      id: 1,
      gameId: "elden-ring",
      title: "Elden Ring",
      cover: "/c.webp",
      storeName: "Steam",
      kind: "official",
      regionName: "Turkey",
      src: "live",
      from: 40,
      to: 30,
      pct: -25,
      t: Date.now(),
    };
    withRouter(<ChangeList changes={[change]} />);
    const item = screen.getByRole("link");
    expect(item.textContent).toContain("from $40.00");
    expect(item.textContent).toContain("to $30.00");
    expect(item.textContent).toContain("−25%");
    expect(item.textContent).toContain("Turkey");
  });
});

describe("Header navigation", () => {
  const app = {
    meta: null,
    region: "us",
    setRegion: () => {},
    live: { connected: true, status: null },
    wishlist: [{ id: "a" }, { id: "b" }],
  };
  const highlighted = (url) => {
    withRouter(
      <AppContext.Provider value={app}>
        <Header />
      </AppContext.Provider>,
      url
    );
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    const current = within(nav)
      .getAllByRole("link")
      .filter((a) => a.getAttribute("aria-current") === "page")
      .map((a) => a.textContent);
    cleanup();
    return current;
  };

  it("highlights only the link whose filter matches the page", () => {
    expect(highlighted("/browse?promo=1")).toEqual(["Deals"]);
    expect(highlighted("/browse?when=soon&sort=price")).toEqual(["Releases"]);
    expect(highlighted("/browse")).toEqual([]);
    expect(highlighted("/wishlist")).toEqual(["My list2"]);
  });
});
