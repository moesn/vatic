import { requestClient } from '#/api/request';

export const getStatsDataApi = async () => {
  return requestClient.get('/kab/home/dashboard');
};
export const getDeviceListApi = async () => {
  return requestClient.get('/kab/device/queryList');
};

export const getWeatherListApi = async () => {
  return requestClient.get('/kab/weather/queryList');
};
