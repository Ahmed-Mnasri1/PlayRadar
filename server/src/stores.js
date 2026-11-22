// Store directory. "official" stores follow the buyer's region; "key" shops sell
// activation keys at one global price. `live` = a real data source exists in this
// project; everything else is sample data (see README, "Data sources").
const enc = encodeURIComponent;

export const STORES = {
  steam: { name: "Steam", short: "ST", kind: "official", tint: "#8fb8ff", platforms: ["PC"], live: true },
  epic: { name: "Epic Games Store", short: "EG", kind: "official", tint: "#eef1f6", platforms: ["PC"] },
  gog: { name: "GOG", short: "GG", kind: "official", tint: "#7fd6c2", platforms: ["PC"] },
  rockstar: { name: "Rockstar Store", short: "RS", kind: "official", tint: "#f5c542", platforms: ["PC"] },
  psn: { name: "PlayStation Store", short: "PS", kind: "official", tint: "#a3c4ff", platforms: ["PS5"] },
  xbox: { name: "Xbox Store", short: "XB", kind: "official", tint: "#9be37a", platforms: ["Xbox Series"] },
  nintendo: { name: "Nintendo eShop", short: "NS", kind: "official", tint: "#ff7b7b", platforms: ["Switch"] },

  eneba: { name: "Eneba", short: "EN", kind: "key", tint: "#b9a2ff", platforms: ["PC"] },
  kinguin: { name: "Kinguin", short: "KG", kind: "key", tint: "#ffb877", platforms: ["PC"] },
  g2a: { name: "G2A", short: "G2", kind: "key", tint: "#ff9d9d", platforms: ["PC"] },
  gamivo: { name: "Gamivo", short: "GV", kind: "key", tint: "#8fe3ff", platforms: ["PC"] },
  ggdeals: { name: "Best keyshop (gg.deals)", short: "GD", kind: "key", tint: "#c8f169", platforms: ["PC"], live: true },
  // Cheapest official PC store found by gg.deals (Fanatical, Humble, GMG…), US prices only.
  ggretail: { name: "Best retail store (gg.deals)", short: "GR", kind: "official", tint: "#c8f169", platforms: ["PC"], live: true },
};

export const SAMPLE_KEYSHOPS = ["eneba", "kinguin", "g2a", "gamivo"];

/** Link to the game on a given store (exact for Steam, a store search elsewhere). */
export function storeUrl(store, game, extra = {}) {
  const q = enc(game.title);
  switch (store) {
    case "steam":
      return `https://store.steampowered.com/app/${game.appid}/`;
    case "epic":
      return `https://store.epicgames.com/en-US/browse?q=${q}`;
    case "gog":
      return `https://www.gog.com/en/games?query=${q}`;
    case "rockstar":
      return "https://store.rockstargames.com/";
    case "psn":
      return `https://store.playstation.com/en-us/search/${q}`;
    case "xbox":
      return `https://www.xbox.com/en-US/search?q=${q}`;
    case "nintendo":
      return `https://www.nintendo.com/us/search/#q=${q}`;
    case "eneba":
      return `https://www.eneba.com/store/all?text=${q}`;
    case "kinguin":
      return `https://www.kinguin.net/listing?phrase=${q}`;
    case "g2a":
      return `https://www.g2a.com/search?query=${q}`;
    case "gamivo":
      return `https://www.gamivo.com/search/${q}`;
    case "ggdeals":
    case "ggretail":
      return extra.url || `https://gg.deals/games/?title=${q}`;
    default:
      return "#";
  }
}
