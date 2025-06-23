import { requestClient } from '#/api/request';

export const getDataStatsApi = async () => {
  return requestClient.get('/home/dashboard');
};

export const getEventStatsApi = async () => {
  return requestClient.get('/riskevents/eventStateViewStatistics');
};
export const getDeviceListApi = async () => {
  return requestClient.get('/device/queryList');
};

export const getWeatherListApi = async () => {
  return requestClient.get('/home/queryWeatherList');
};

export const getTaskStatsApi = async () => {
  return requestClient.get('/task/taskCountByStatus');
};
