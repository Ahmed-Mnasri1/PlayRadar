// Regions tracked by the watcher. Official store prices are regional; keyshop
// prices are global (a key costs the same wherever you are).
//  - steamCc : country code sent to the Steam storefront API
//  - factor  : rough price level vs. the US, only used for *sample* prices
export const REGIONS = [
  { code: "us", name: "United States", steamCc: "us", factor: 1.0 },
  { code: "eu", name: "Europe (Eurozone)", steamCc: "de", factor: 1.08 },
  { code: "gb", name: "United Kingdom", steamCc: "gb", factor: 0.92 },
  { code: "ca", name: "Canada", steamCc: "ca", factor: 0.96 },
  { code: "tn", name: "Tunisia", steamCc: "tn", factor: 0.8 },
  { code: "tr", name: "Turkey", steamCc: "tr", factor: 0.42 },
  { code: "ar", name: "Argentina", steamCc: "ar", factor: 0.38 },
  { code: "br", name: "Brazil", steamCc: "br", factor: 0.55 },
  { code: "in", name: "India", steamCc: "in", factor: 0.48 },
];
export const REGION_CODES = REGIONS.map((r) => r.code);
export const DEFAULT_REGION = "us";
export const regionByCode = (c) => REGIONS.find((r) => r.code === c);
