import { requestClient } from '#/api/request';

export const getCarListApi = async () => {
  return requestClient.get('/kab/car/queryList');
};

export const getTracList = async (params) => {
  return requestClient.get('/kab/car/trackQuery', { params });
};
