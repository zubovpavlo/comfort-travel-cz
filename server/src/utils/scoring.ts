import { Route } from '../types';
import { timeToMinutes } from './timeUtils';

/**
 * Calculate comfort sub-score for a route (0 to 1, higher = more comfortable).
 */
export function calculateComfortScore(route: Route): number {
  // Transfer penalty: fewer transfers = more comfortable
  const transferPenalty = Math.max(0, 1.0 - route.transfers * 0.35);

  // Wait penalty: less waiting = more comfortable
  const waitPenalty = Math.max(0, 1.0 - route.totalWaitMinutes / 180);

  // Comfort class bonus
  const classValues: Record<string, number> = {
    standard: 0.5,
    comfort: 0.75,
    business: 1.0,
  };
  const avgClass =
    route.segments.reduce((sum, s) => sum + (classValues[s.comfortClass] || 0.5), 0) /
    route.segments.length;

  // Time of day bonus: penalize very early (<6:00) or very late (>22:00)
  const firstDep = timeToMinutes(route.segments[0].departureTime);
  let timeBonus = 1.0;
  if (firstDep < 360) {
    // Before 6:00
    timeBonus = 0.5 + (firstDep / 360) * 0.5;
  } else if (firstDep > 1320) {
    // After 22:00
    timeBonus = 0.5;
  }

  // Weighted combination
  const w1 = 0.35; // transfer
  const w2 = 0.25; // wait
  const w3 = 0.2; // class
  const w4 = 0.2; // time of day

  return w1 * transferPenalty + w2 * waitPenalty + w3 * avgClass + w4 * timeBonus;
}

/**
 * Min-max normalize an array of values.
 * For lower-is-better metrics, set `invert = true`.
 */
export function minMaxNormalize(values: number[], invert = false): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (max === min) {
    return values.map(() => 1.0);
  }

  return values.map((v) => {
    const normalized = (v - min) / (max - min);
    return invert ? 1 - normalized : normalized;
  });
}
