import { requestClient } from '#/api/request';

export const getCarListApi = async () => {
  return requestClient.get('/kab/car/queryList');
};
