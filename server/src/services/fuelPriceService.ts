import { FuelType } from '../types';

export interface FuelPrices {
  benzin: number;
  diesel: number;
  lpg: number;
  source: string;
  updated: string;
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const CACHE_TTL_MS = 3600 * 1000; // 1 hour

let cache: FuelPrices | null = null;
let cacheTime = 0;

async function getHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(10000),
  });
  return res.text();
}

// Find a CZK-per-liter price in [lo, hi] range using multiple patterns.
// The range check is the main filter: it discards USD/EUR rows that share the same layout.
function findPrice(html: string, lo: number, hi: number): number | null {
  const patterns = [
    // Best: "current ... is CZK 41.38 per liter"
    /current\b[^.]{0,150}is\s+CZK\s+(\d{2,3}[.,]\d{2})\s+per\s+liter/i,
    // Table row: "Current price</td><td>41.38"
    /current\s+price[\s\S]{0,80}?<td[^>]*>\s*(\d{2,3}[.,]\d{2})\s*</gi,
    // "41.38 CZK/Liter"
    /(\d{2,3}[.,]\d{2})\s*CZK\s*\/\s*[Ll]/gi,
    // CZK then price
    /CZK[^<>\d]{0,20}(\d{2,3}[.,]\d{2})/gi,
  ];
  for (const re of patterns) {
    if (re.global) re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const raw = m[1] ?? '';
      const v = parseFloat(raw.replace(',', '.'));
      if (v >= lo && v <= hi) return v;
      if (!re.global) break;
    }
  }
  return null;
}

async function scrape(): Promise<FuelPrices | null> {
  try {
    const [hB, hD, hL] = await Promise.all([
      getHtml('https://www.globalpetrolprices.com/Czech-Republic/gasoline_prices/'),
      getHtml('https://www.globalpetrolprices.com/Czech-Republic/diesel_prices/'),
      getHtml('https://www.globalpetrolprices.com/Czech-Republic/lpg_prices/'),
    ]);
    const benzin = findPrice(hB, 25, 65);
    const diesel = findPrice(hD, 25, 70);
    const lpg = findPrice(hL, 10, 35);
    if (benzin && diesel) {
      return {
        benzin,
        diesel,
        lpg: lpg ?? 15.5,
        source: 'GlobalPetrolPrices.com',
        updated: new Date().toISOString().slice(0, 10),
      };
    }
  } catch (err) {
    console.error('Fuel price scrape failed:', err instanceof Error ? err.message : err);
  }
  return null;
}

export const fuelPriceService = {
  async getPrices(force = false): Promise<FuelPrices | null> {
    const now = Date.now();
    if (!force && cache && now - cacheTime < CACHE_TTL_MS) return cache;
    const fresh = await scrape();
    if (fresh) {
      cache = fresh;
      cacheTime = now;
      return fresh;
    }
    return cache; // return stale on scrape failure, null if we never had any
  },

  async getPrice(fuel: FuelType): Promise<number | null> {
    const prices = await this.getPrices();
    return prices ? prices[fuel] : null;
  },
};
