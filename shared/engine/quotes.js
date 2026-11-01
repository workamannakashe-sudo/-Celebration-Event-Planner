/**
 * @file quotes.js
 * @description Quote Comparer engine.
 * Lets Meera enter 1–4 vendor quotes for the same category and receive
 * a ranked comparison with negotiation floor and overspend warning.
 * Pure function – no side effects.
 */

/**
 * @typedef {Object} VendorQuote
 * @property {string} vendorName  - Vendor display name
 * @property {number} quotedPrice - Quoted price in INR
 * @property {string} [notes]     - Optional notes / inclusions
 */

/**
 * @typedef {Object} QuoteEntry
 * @property {string}  vendorName
 * @property {number}  quotedPrice
 * @property {string}  [notes]
 * @property {number}  rank              - 1 = cheapest
 * @property {number}  premiumOverBest   - % more expensive than cheapest (0 for rank 1)
 * @property {number}  negotiationFloor  - Recommended floor to negotiate to (INR)
 * @property {boolean} overBudget        - True if quotedPrice > categoryBudget
 * @property {number}  overBudgetBy      - INR over the category budget (0 if under)
 */

/**
 * @typedef {Object} QuoteComparisonResult
 * @property {QuoteEntry[]} quotes        - Ranked quotes
 * @property {number}       bestPrice     - Cheapest quote (INR)
 * @property {number}       worstPrice    - Most expensive quote (INR)
 * @property {number}       spread        - Spread between best and worst (INR)
 * @property {number}       spreadPct     - Spread as % of best price (1dp)
 * @property {string}       recommendation - Plain-English advice for Meera
 */

/**
 * Typical negotiation headroom percentages per category.
 * @type {Record<string, number>}
 */
const NEGOTIATION_HEADROOM = {
  venue:          0.12,
  catering:       0.08,
  decor:          0.10,
  photo:          0.06,
  entertainment:  0.10,
  logistics:      0.08,
  default:        0.09,
};

/**
 * Get negotiation headroom for a category slug.
 * @param {string} category
 * @returns {number}
 */
function getHeadroom(category) {
  const key = category.toLowerCase().replace(/[^a-z]/g, '');
  for (const [k, v] of Object.entries(NEGOTIATION_HEADROOM)) {
    if (key.includes(k)) return v;
  }
  return NEGOTIATION_HEADROOM.default;
}

/**
 * Compare vendor quotes for a single category.
 *
 * @param {string}       categoryName   - Display name of the budget category
 * @param {number}       categoryBudget - Allocated budget for this category (INR)
 * @param {VendorQuote[]} quotes         - 1–4 quotes to compare
 * @returns {QuoteComparisonResult}
 */
export function compareQuotes(categoryName, categoryBudget, quotes) {
  if (!quotes || quotes.length === 0) {
    return {
      quotes: [],
      bestPrice: 0,
      worstPrice: 0,
      spread: 0,
      spreadPct: 0,
      recommendation: 'No quotes provided.',
    };
  }

  const headroom = getHeadroom(categoryName);

  // Sort by price ascending
  const sorted = [...quotes].sort((a, b) => a.quotedPrice - b.quotedPrice);
  const bestPrice  = sorted[0].quotedPrice;
  const worstPrice = sorted[sorted.length - 1].quotedPrice;
  const spread     = worstPrice - bestPrice;
  const spreadPct  = bestPrice > 0 ? parseFloat(((spread / bestPrice) * 100).toFixed(1)) : 0;

  const entries = quotes.map((q) => {
    const rank = sorted.findIndex((s) => s.vendorName === q.vendorName) + 1;
    const premiumOverBest = bestPrice > 0
      ? parseFloat((((q.quotedPrice - bestPrice) / bestPrice) * 100).toFixed(1))
      : 0;
    const negotiationFloor = Math.round(q.quotedPrice * (1 - headroom));
    const overBudgetBy = Math.max(0, q.quotedPrice - categoryBudget);
    return {
      vendorName:      q.vendorName,
      quotedPrice:     q.quotedPrice,
      notes:           q.notes,
      rank,
      premiumOverBest,
      negotiationFloor,
      overBudget:      overBudgetBy > 0,
      overBudgetBy,
    };
  });

  // Recommendation
  let recommendation;
  if (entries.length === 1) {
    const onlyEntry = entries[0];
    if (onlyEntry.overBudget) {
      recommendation = `Only one quote, and it exceeds your ${categoryName} budget by ₹${onlyEntry.overBudgetBy.toLocaleString('en-IN')}. Negotiate to ₹${onlyEntry.negotiationFloor.toLocaleString('en-IN')} or get 2 more quotes.`;
    } else {
      recommendation = `Only one quote. Try negotiating down to ₹${onlyEntry.negotiationFloor.toLocaleString('en-IN')} (${Math.round(headroom * 100)}% off).`;
    }
  } else if (spreadPct > 40) {
    recommendation = `Large spread of ${spreadPct}% – significant price variation. The cheapest may have hidden costs; ask all vendors for a detailed scope before deciding.`;
  } else {
    const best = entries.find((e) => e.rank === 1);
    const budgetStatus = best && best.overBudget
      ? `₹${best.overBudgetBy.toLocaleString('en-IN')} over your budget`
      : 'within your budget';
    recommendation = `Best quote from ${best?.vendorName} is ${budgetStatus}. Negotiate to ₹${best?.negotiationFloor.toLocaleString('en-IN')} and compare inclusions carefully.`;
  }

  return {
    quotes: entries,
    bestPrice,
    worstPrice,
    spread,
    spreadPct,
    recommendation,
  };
}
