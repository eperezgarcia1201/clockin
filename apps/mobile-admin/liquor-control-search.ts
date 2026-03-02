import type { LiquorCatalogItem } from "./types";

type SearchItem = {
  name: string;
  brand?: string | null;
  upc?: string | null;
  supplierName?: string | null;
};

export const matchesLiquorSearch = (item: SearchItem, query: string) => {
  const name = item.name.toLowerCase();
  const brand = (item.brand || "").toLowerCase();
  const upc = (item.upc || "").toLowerCase();
  const supplier = (item.supplierName || "").toLowerCase();
  return (
    name.includes(query) ||
    brand.includes(query) ||
    upc.includes(query) ||
    supplier.includes(query)
  );
};

const rankLiquorSuggestion = (item: SearchItem, query: string) => {
  const name = item.name.toLowerCase();
  const brand = (item.brand || "").toLowerCase();
  const upc = (item.upc || "").toLowerCase();
  const supplier = (item.supplierName || "").toLowerCase();
  if (name.startsWith(query)) {
    return 0;
  }
  if (supplier.startsWith(query)) {
    return 1;
  }
  if (brand.startsWith(query)) {
    return 2;
  }
  if (upc.startsWith(query)) {
    return 3;
  }
  if (name.includes(query)) {
    return 4;
  }
  if (supplier.includes(query)) {
    return 5;
  }
  if (brand.includes(query)) {
    return 6;
  }
  return 7;
};

export const sortLiquorSuggestions = (items: LiquorCatalogItem[], query: string) =>
  items
    .filter((item) => matchesLiquorSearch(item, query))
    .sort((a, b) => {
      const rankDiff = rankLiquorSuggestion(a, query) - rankLiquorSuggestion(b, query);
      if (rankDiff !== 0) {
        return rankDiff;
      }
      return a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
      });
    });
