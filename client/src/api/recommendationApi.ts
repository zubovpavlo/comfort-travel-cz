import api from './axiosInstance';
import { SearchParams, ScoredCombo } from '../types';

export const recommendationApi = {
  search: (params: SearchParams) =>
    api.post<{ count: number; results: ScoredCombo[] }>('/recommendations/search', params),
};
