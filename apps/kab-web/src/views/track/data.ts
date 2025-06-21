import { requestClient } from '#/api/request';

export const getTrackList = async (params: any) => {
  return requestClient.get('/kab/car/trackQuery', { params });
};
