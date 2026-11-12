import { requestClient } from '#/api/request';

export const getSnapshotListApi = async (params: any) => {
  return requestClient.get('/vehicleRecognition/pageQueryList', { params });
};

/** 车辆识别记录导出 Excel（参数与 pageQueryList 一致） */
export const exportSnapshotApi = async (params: any) => {
  return requestClient.download('/vehicleRecognition/exportExcel', { params });
};

export const getSnapshotStatsApi = async (params: any) => {
  return requestClient.get('/vehicleRecognition/recognitionStatistics', {
    params,
  });
};
