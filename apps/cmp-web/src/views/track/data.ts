import { requestClient } from '#/api/request';

export const getTrackList = async (params: any) => {
  return requestClient.get('/car/trackQuery', { params });
};
