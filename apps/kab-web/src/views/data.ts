import { requestClient } from '#/api/request';

export const getCarListApi = async () => {
  return requestClient.get('/kab/car/queryList');
};

export const getDictListApi = async (dictTypeId: number) => {
  return requestClient.get(
    `/kab/dict/dictDataQueryList?dictTypeId=${dictTypeId}`,
  );
};
