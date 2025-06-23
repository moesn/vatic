import { requestClient } from '#/api/request';

export const getCarListApi = async () => {
  return requestClient.get('/car/queryList');
};

export const getDictListApi = async (dictTypeId: number) => {
  return requestClient.get(`/dict/dictDataQueryList?dictTypeId=${dictTypeId}`);
};
