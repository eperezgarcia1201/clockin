import type {
  LiquorCatalogAiResponse,
  LiquorCatalogItem,
} from "./types";

type ResolveLiquorCatalogAssistParams = {
  query: string;
  liquorCatalog: LiquorCatalogItem[];
  fetchJson: (path: string, init?: RequestInit) => Promise<unknown>;
};

type ResolveLiquorCatalogAssistResult = {
  payload: LiquorCatalogAiResponse;
  statusMessage: string;
  searchHint: string | null;
};

function buildLocalAssist(
  request: string,
  liquorCatalog: LiquorCatalogItem[],
): LiquorCatalogAiResponse {
  const normalized = request.toLowerCase().trim();
  const tokens = normalized
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1)
    .slice(0, 12);

  const mlMatch = normalized.match(/(\d{2,4}(?:\.\d+)?)\s*ml\b/);
  const maxCostMatch = normalized.match(
    /(?:under|below|less than|up to|hasta|menos de|<=|<)\s*\$?\s*(\d+(?:\.\d+)?)/,
  );
  const targetMl = mlMatch ? Number(mlMatch[1]) : null;
  const maxCost = maxCostMatch ? Number(maxCostMatch[1]) : null;

  const ranked = liquorCatalog
    .map((item) => {
      const name = item.name.toLowerCase();
      const company = (item.supplierName || "").toLowerCase();
      const kind = (item.brand || "").toLowerCase();
      const upc = (item.upc || "").toLowerCase();
      let score = 0;
      const reasons: string[] = [];

      if (name.startsWith(normalized)) {
        score += 8;
        reasons.push("name starts with query");
      } else if (name.includes(normalized)) {
        score += 6;
        reasons.push("name contains query");
      }
      if (company.includes(normalized)) {
        score += 4;
        reasons.push("company match");
      }
      if (kind.includes(normalized)) {
        score += 3;
        reasons.push("kind match");
      }

      tokens.forEach((token) => {
        if (name.includes(token)) {
          score += 2.5;
        }
        if (company.includes(token)) {
          score += 2;
        }
        if (kind.includes(token)) {
          score += 1.5;
        }
        if (upc.includes(token)) {
          score += 2.5;
        }
      });

      if (
        targetMl !== null &&
        Number.isFinite(targetMl) &&
        item.sizeMl !== null &&
        Number.isFinite(item.sizeMl)
      ) {
        const diff = Math.abs(item.sizeMl - targetMl);
        if (diff <= 1) {
          score += 4;
          reasons.push(`${targetMl}ml exact`);
        } else if (diff <= 30) {
          score += 2;
          reasons.push(`${targetMl}ml near`);
        }
      }

      if (maxCost !== null && Number.isFinite(maxCost)) {
        if (item.unitCost <= maxCost) {
          score += 2;
          reasons.push(`under $${maxCost.toFixed(2)}`);
        } else {
          score -= 1;
        }
      }

      return {
        item,
        score,
        reason: reasons[0] || "local smart match",
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.item.name.localeCompare(b.item.name, undefined, {
        sensitivity: "base",
      });
    })
    .slice(0, 12);

  const topScore = ranked[0]?.score || 1;
  return {
    source: "heuristic",
    query: request,
    summary:
      ranked.length > 0
        ? "Smart local catalog ranking applied."
        : "No local catalog matches found.",
    searchHint: tokens.slice(0, 4).join(" "),
    matches: ranked.map((entry, index) => ({
      rank: index + 1,
      score: Math.max(1, (entry.score / topScore) * 100),
      reason: entry.reason,
      item: entry.item,
    })),
  };
}

export async function resolveLiquorCatalogAssist({
  query,
  liquorCatalog,
  fetchJson,
}: ResolveLiquorCatalogAssistParams): Promise<ResolveLiquorCatalogAssistResult> {
  try {
    const payload = (await fetchJson("/liquor-inventory/catalog/ai-assist", {
      method: "POST",
      body: JSON.stringify({
        query,
        limit: 12,
      }),
    })) as LiquorCatalogAiResponse;

    const matchCount = Array.isArray(payload.matches) ? payload.matches.length : 0;
    return {
      payload,
      statusMessage:
        matchCount > 0
          ? `AI found ${matchCount} catalog matches.`
          : "AI found no catalog matches.",
      searchHint:
        typeof payload.searchHint === "string" && payload.searchHint.trim()
          ? payload.searchHint.trim()
          : null,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to run AI catalog assistant.";
    const local = buildLocalAssist(query, liquorCatalog);
    const statusMessage = /\(404\)/.test(message) || /Cannot POST/i.test(message)
      ? "AI endpoint unavailable on this API. Using smart local catalog ranking."
      : message;

    return {
      payload: local,
      statusMessage,
      searchHint:
        typeof local.searchHint === "string" && local.searchHint.trim()
          ? local.searchHint.trim()
          : null,
    };
  }
}
