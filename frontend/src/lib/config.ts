/**
 * Application configuration — Mahyco
 */

export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

// Kept for compatibility with template components that may reference this
export const DEFAULT_STAGE6_FIELD_WEIGHTS: Record<string, number> = {
  COUNTRY: 6,
  COUNTRY_SUBDIVISION: 5,
  POSTCODE: 4,
  CITY: 3,
  DISTRICT_NAME: 2,
  TOWN_LOCATION_NAME: 1,
};
