import { requestClient } from '#/api/request';

/** 轨迹点（后端 /car/trackQuery 返回结构） */
export interface TrackPoint {
  /** 方向（度） */
  direction?: number | string;
  /** 位置描述 */
  location?: string;
  /** 纬度 */
  latitude?: number | string;
  /** 经度 */
  longitude?: number | string;
  /** 车牌号 */
  plateNo?: string;
  /** 定位时间（yyyy-MM-dd HH:mm:ss.SSS） */
  pointTime?: string;
  /** 速度 */
  speed?: number | string;
}

export const getTrackList = async (params: any) => {
  return requestClient.get<TrackPoint[]>('/car/trackQuery', { params });
};
