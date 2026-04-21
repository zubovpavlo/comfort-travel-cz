import { findOptimalRoutes } from './routeFinder';
import { accommodationService } from './accommodationService';
import { carRouteService } from './carRouteService';
import { RecommendationRequest, RecommendationWeights, Route, ScoredCombo, Accommodation } from '../types';
import { calculateComfortScore, minMaxNormalize } from '../utils/scoring';

const DEFAULT_WEIGHTS: RecommendationWeights = {
  price: 0.35,
  travel_time: 0.25,
  comfort: 0.25,
  rating: 0.15,
};

// Czech OSM accommodations rarely have `stars` tags, so star_rating is null for most.
// Map price_per_night to a quality score using the same thresholds as priceHeuristic()
// in accommodationService.ts so the mapping is internally consistent.
function inferQuality(acc: Accommodation): number {
  if (acc.star_rating !== null) return acc.star_rating;
  const price = acc.price_per_night;
  if (price === null) return 3.0;
  if (price < 800)  return 2.0; // hostel range (base ~560 CZK/night)
  if (price < 1400) return 2.5; // pension/guest_house range (base ~1100)
  if (price < 2000) return 3.0; // lower hotel / apartment (base ~1800)
  if (price < 2800) return 3.5; // 3-star hotel (base ~2100)
  if (price < 4500) return 4.0; // 4-star hotel (base ~3400)
  return 4.5;                   // 5-star hotel (base ~5800)
}

export const recommendationService = {
  async search(request: RecommendationRequest): Promise<ScoredCombo[]> {
    const weights = request.weights || DEFAULT_WEIGHTS;
    const filters = request.filters || {};

    if (!request.origin || !request.destination) return [];

    // Step 1: Find outbound + return routes. Either via Transitous (transit) or OSRM (car).
    let filteredOut: Route[];
    let filteredRet: Route[];

    if (request.transport_mode === 'car') {
      if (!request.car_options) return [];
      const [out, ret] = await Promise.all([
        carRouteService.getRoute(request.origin, request.destination, request.car_options, request.car_options.outbound_time),
        carRouteService.getRoute(request.destination, request.origin, request.car_options, request.car_options.return_time),
      ]);
      if (!out || !ret) return [];
      filteredOut = [out];
      filteredRet = [ret];
    } else {
      const [outboundRoutes, returnRoutes] = await Promise.all([
        findOptimalRoutes({
          origin: request.origin,
          destination: request.destination,
          date: request.travel_date,
          transportTypes: filters.transport_types,
          maxTransfers: filters.max_transfers,
        }),
        findOptimalRoutes({
          origin: request.destination,
          destination: request.origin,
          date: request.return_date,
          transportTypes: filters.transport_types,
          maxTransfers: filters.max_transfers,
        }),
      ]);

      // Apply max_transfers filter (belt-and-suspenders: MOTIS may not enforce it)
      const mt = filters.max_transfers;
      filteredOut = mt !== undefined ? outboundRoutes.filter(r => r.transfers <= mt) : outboundRoutes;
      filteredRet = mt !== undefined ? returnRoutes.filter(r => r.transfers <= mt)   : returnRoutes;

      if (filteredOut.length === 0 || filteredRet.length === 0) {
        return [];
      }
    }

    // Step 2: Find accommodations near the destination via Overpass
    const accommodations = await accommodationService.search({
      lat: request.destination.lat,
      lon: request.destination.lon,
      radiusM: filters.radius_m,
      type: filters.accommodation_types,
      min_rating: filters.min_accommodation_rating,
      max_price: filters.max_price_total
        ? filters.max_price_total / Math.max(1, request.nights)
        : undefined,
      amenities: filters.amenities,
    }) as Accommodation[];

    if (accommodations.length === 0) {
      return [];
    }

    // Build a diverse pool: top 10 by rating (for high-rating-weight users) +
    // top 10 by price ascending (for high-price-weight users).
    // The union ensures both dimensions have meaningful candidates in the scoring loop.
    const byRating = [...accommodations]
      .sort((a, b) => (b.star_rating ?? 0) - (a.star_rating ?? 0))
      .slice(0, 10);
    const byPrice = [...accommodations]
      .sort((a, b) => (a.price_per_night ?? Infinity) - (b.price_per_night ?? Infinity))
      .slice(0, 10);
    const seen = new Set<string>();
    const topAccommodations: Accommodation[] = [];
    for (const acc of [...byRating, ...byPrice]) {
      if (!seen.has(acc.external_id)) {
        seen.add(acc.external_id);
        topAccommodations.push(acc);
      }
    }

    interface RawCombo {
      outbound: Route;
      ret: Route;
      accommodation: Accommodation;
      totalPrice: number;
      totalTravel: number;
      comfort: number;
      rating: number;
    }

    const combos: RawCombo[] = [];

    for (const outbound of filteredOut) {
      const outComfort = calculateComfortScore(outbound);

      for (const ret of filteredRet) {
        const retComfort = calculateComfortScore(ret);
        const avgComfort = (outComfort + retComfort) / 2;
        const totalTravel = outbound.totalDurationMinutes + ret.totalDurationMinutes;

        for (const acc of topAccommodations) {
          const pricePerNight = acc.price_per_night !== null ? Number(acc.price_per_night) : 0;
          const totalPrice =
            outbound.totalPriceCzk +
            ret.totalPriceCzk +
            pricePerNight * request.nights;

          if (filters.max_price_total && totalPrice > filters.max_price_total) continue;

          combos.push({
            outbound,
            ret,
            accommodation: acc,
            totalPrice,
            totalTravel,
            comfort: avgComfort,
            rating: inferQuality(acc),
          });
        }
      }
    }

    if (combos.length === 0) return [];

    const prices = combos.map((c) => c.totalPrice);
    const times = combos.map((c) => c.totalTravel);
    const comforts = combos.map((c) => c.comfort);
    const ratings = combos.map((c) => c.rating);

    const normPrices = minMaxNormalize(prices, true);
    const normTimes = minMaxNormalize(times, true);
    const normComforts = minMaxNormalize(comforts, false);
    const normRatings = minMaxNormalize(ratings, false);

    const scored: ScoredCombo[] = combos.map((combo, i) => {
      const totalScore =
        weights.price * normPrices[i] +
        weights.travel_time * normTimes[i] +
        weights.comfort * normComforts[i] +
        weights.rating * normRatings[i];

      return {
        outbound_route: combo.outbound,
        return_route: combo.ret,
        accommodation: combo.accommodation,
        total_price_czk: combo.totalPrice,
        total_travel_minutes: combo.totalTravel,
        comfort_score: combo.comfort,
        accommodation_rating: combo.rating,
        normalized_scores: {
          price: Math.round(normPrices[i] * 1000) / 1000,
          travel_time: Math.round(normTimes[i] * 1000) / 1000,
          comfort: Math.round(normComforts[i] * 1000) / 1000,
          rating: Math.round(normRatings[i] * 1000) / 1000,
        },
        total_score: Math.round(totalScore * 1000) / 1000,
      };
    });

    scored.sort((a, b) => b.total_score - a.total_score);
    return scored.slice(0, 50);
  },
};
