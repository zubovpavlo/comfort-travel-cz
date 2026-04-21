import db from '../config/database';
import { accommodationService, AccommodationSearchInput } from '../services/accommodationService';
import { Accommodation } from '../types';

export const accommodationModel = {
  search(params: AccommodationSearchInput): Promise<Accommodation[]> {
    return accommodationService.search(params);
  },

  findById(externalId: string): Promise<Accommodation | null> {
    return accommodationService.findById(externalId);
  },

  async count(): Promise<number> {
    return accommodationService.count();
  },
};
