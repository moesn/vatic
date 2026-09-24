import { requestClient } from '#/api/request';

/** 事件记录（新接口返回结构） */
export interface EventRecord {
  id: number;
  createdTime?: string;
  updatedTime?: string;
  createdBy?: number;
  updatedBy?: number;
  eventType?: string;
  location?: string;
  captureTime?: string;
  durationMinutes?: number;
  sourceDeviceId?: number;
  imageUrl?: string;
  level?: string;
  status?: string;
  assignedTo?: number;
  processedAt?: string;
  processedBy?: number;
  remark?: string;
  longitude?: string;
  latitude?: string;
}

interface PageResult<T> {
  records?: T[];
  total?: number;
  size?: number;
  current?: number;
  pages?: number;
}

/** 事件列表查询参数 */
export interface EventListParams {
  eventType?: string;
  location?: string;
  level?: string;
  status?: string;
  startTime?: string;
  endTime?: string;
  pageNo?: number;
  pageSize?: number;
}

/** 事件列表 */
export function getEventListApi(params: EventListParams) {
  return requestClient.get<PageResult<EventRecord>>('/riskEvent/pageQueryList', {
    params,
  });
}

/** 事件类型选项 */
export function getEventStatsApi() {
  return requestClient.get<any[]>('/riskevents/eventViewStatistics');
}

/** 员工列表（派发/处置用） */
export function getStaffListApi() {
  return requestClient.get('/staff/queryList');
}

/** 派发 */
export function dispatchApi(data: any) {
  return requestClient.post('/riskevents/dispatch', data);
}

/** 处置 */
export function disposeApi(data: any) {
  return requestClient.post('/riskevents/dispose', data);
}
