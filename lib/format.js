export function formatPrice(price, currency = "EUR") {
  if (price == null || !Number.isFinite(Number(price))) return "Prix à venir";
  if (currency === "TND") {
    return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(price * 3.4))} DT`;
  }
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}
