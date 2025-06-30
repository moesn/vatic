import { requestClient } from '#/api/request';

export const getStaffListApi = async () => {
  return requestClient.get('/staff/queryList');
};

export const getEventStatsApi = async () => {
  return requestClient.get('/riskevents/eventViewStatistics');
};

export const getStreetTreeApi = async () => {
  return requestClient.get('/region/lazy-tree');
};

export const getEventListApi = async (data: any) => {
  return requestClient.post('/riskevents/eventViewStatisticsList', data);
};

export const dispatchApi = async (data: any) => {
  return requestClient.post('/riskevents/dispatch', data);
};

export const disposeApi = async (data: any) => {
  return requestClient.post('/riskevents/dispose', data);
};
