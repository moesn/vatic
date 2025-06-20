import { requestClient } from '#/api/request';

export const getDataStatsApi = async () => {
  return requestClient.get('/kab/home/dashboard');
};

export const getEventStatsApi = async () => {
  return requestClient.get('/kab/riskevents/eventStateViewStatistics');
};
export const getDeviceListApi = async () => {
  return requestClient.get('/kab/device/queryList');
};

export const getWeatherListApi = async () => {
  return requestClient.get('/kab/weather/queryList');
};

export const getTaskStatsApi = async () => {
  return requestClient.get('/kab/task/taskCountByStatus');
};
