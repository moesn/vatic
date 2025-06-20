import { requestClient } from '#/api/request';

export const getStaffListApi = async () => {
  return requestClient.get('/kab/staff/queryList');
};

export const getEventStatsApi = async () => {
  return requestClient.get('/kab/riskevents/eventViewStatistics');
};

export const getStreetTreeApi = async () => {
  return requestClient.get('/kab/region/lazy-tree');
};

export const getEventListApi = async (data: any) => {
  return requestClient.post('/kab/riskevents/eventViewStatisticsList', data);
};
