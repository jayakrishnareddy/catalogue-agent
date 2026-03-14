import type { QueryFilters } from "../types.js";

/**
 * Lightweight rule-based parser: user query -> structured filters.
 * No LLM calls for speed and reliability.
 */
export function parseQueryFilters(userQuery: string): QueryFilters {
  const q = userQuery.toLowerCase().trim();
  const filters: QueryFilters = {
    category: null,
    subcategory: null,
    maxPrice: null,
    minPrice: null,
    stoneColor: null,
    requireStone: false,
    occasion: null,
  };

  // Category / subcategory: necklace, earrings, bangles, jhumka, stud, bridal, daily, party, set
  const categoryPatterns: { pattern: RegExp; category: string | null; subcategory?: string | null }[] = [
    { pattern: /\b(necklace|necklaces)\b/, category: "Necklace" },
    { pattern: /\b(earring|earrings)\b/, category: "Earrings" },
    { pattern: /\b(bangle|bangles)\b/, category: "Bangles" },
    { pattern: /\bjhumka\b/, category: "Earrings", subcategory: "Jhumka" },
    { pattern: /\bstuds?\b/, category: "Earrings", subcategory: "Stud" },
    { pattern: /\bbridal\b/, category: null, subcategory: "Bridal" },
    { pattern: /\bdaily\s*wear\b/, category: null, subcategory: "Daily" },
    { pattern: /\bparty\s*wear\b|\bparty\b/, category: null, subcategory: "Party" },
    { pattern: /\bset\b/, category: null, subcategory: "Party" },
  ];
  for (const { pattern, category, subcategory } of categoryPatterns) {
    if (pattern.test(q)) {
      if (category != null) filters.category = category;
      if (subcategory != null) filters.subcategory = subcategory;
    }
  }

  // Max price: under 1000, below 50000, around 700
  const maxPriceMatch = q.match(/\b(?:under|below|less than|max)\s*(\d+(?:\s*\d{3})*)/i)
    ?? q.match(/\baround\s*(\d+)\b/i)
    ?? q.match(/\b(\d+)\s*(?:and\s*)?under\b/i);
  if (maxPriceMatch) {
    const raw = maxPriceMatch[1].replace(/\s/g, "");
    const n = parseInt(raw, 10);
    if (!isNaN(n)) filters.maxPrice = n;
  }

  // Min price: above 1000, over 1000, more than 1000
  const minPriceMatch = q.match(/\b(?:above|over|more than|min(?:imum)?)\s*(\d+(?:\s*\d{3})*)\s*(?:rupees?|rs\.?|₹)?/i)
    ?? q.match(/\b(\d+)\s*(?:and\s*)?(?:above|over)\b/i);
  if (minPriceMatch) {
    const raw = minPriceMatch[1].replace(/\s/g, "");
    const n = parseInt(raw, 10);
    if (!isNaN(n)) filters.minPrice = n;
  }

  // Stone-based: "stone based", "stone jewellery", "with stones"
  if (/\bstone\s*based\b|\bstone\s*(?:jewellery|jewelry)\b|\bwith\s*stones\b|\bstones?\b/.test(q)) {
    filters.requireStone = true;
  }

  // Stone color: red, green, white, diamond look, pearl, emerald, kundan
  const colorPatterns: { pattern: RegExp; color: string }[] = [
    { pattern: /\bred\b/, color: "red" },
    { pattern: /\bgreen\b/, color: "green" },
    { pattern: /\bwhite\b/, color: "white" },
    { pattern: /\bdiamond\s*look\b|diamond\b/, color: "white" },
    { pattern: /\bpearl\b/, color: "white" },
    { pattern: /\bemerald\b/, color: "green" },
    { pattern: /\bkundan\b/, color: "red" },
  ];
  for (const { pattern, color } of colorPatterns) {
    if (pattern.test(q)) {
      filters.stoneColor = color;
      break;
    }
  }

  // Occasion
  if (/\bbridal\b/.test(q)) filters.occasion = "Bridal";
  else if (/\bdaily\b/.test(q)) filters.occasion = "Daily";
  else if (/\bparty\b/.test(q)) filters.occasion = "Party";

  return filters;
}
