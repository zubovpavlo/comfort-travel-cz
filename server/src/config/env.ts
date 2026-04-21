import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/comfort_travel',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  nodeEnv: process.env.NODE_ENV || 'development',

  transitousBaseUrl: process.env.TRANSITOUS_BASE_URL || 'https://api.transitous.org',
  overpassBaseUrl: process.env.OVERPASS_BASE_URL || 'https://overpass-api.de/api/interpreter',

  accommodationRadiusM: parseInt(process.env.ACCOMMODATION_RADIUS_M || '5000', 10),
  transportCacheTtlMin: parseInt(process.env.TRANSPORT_CACHE_TTL_MIN || '15', 10),
  accommodationCacheTtlMin: parseInt(process.env.ACCOMMODATION_CACHE_TTL_MIN || '1440', 10),

  // Heuristic pricing — Transitous/MOTIS does not return fares.
  transitPriceCzkPerKmRail: parseFloat(process.env.TRANSIT_PRICE_CZK_PER_KM_RAIL || '1.8'),
  transitPriceCzkPerKmBus: parseFloat(process.env.TRANSIT_PRICE_CZK_PER_KM_BUS || '1.2'),
  transitPriceLocalCzk: parseFloat(process.env.TRANSIT_PRICE_LOCAL_CZK || '30'),

  userAgent: process.env.TRANSITOUS_USER_AGENT
    || 'ComfortTravelCZ/1.0 (dev; contact=paolozubov@gmail.com)',

  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost').split(','),
};
