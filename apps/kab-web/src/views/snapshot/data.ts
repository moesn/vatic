import { requestClient } from '#/api/request';

export const getSnapshotListApi = async (params: any) => {
  return requestClient.get('/vehicleRecognition/pageQueryList', { params });
};

export const getSnapshotStatsApi = async (params: any) => {
  return requestClient.get('/vehicleRecognition/recognitionStatistics', {
    params,
  });
};
