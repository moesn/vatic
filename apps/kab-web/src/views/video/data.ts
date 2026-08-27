/**
 * 设备查看页面接口
 *
 * - 设备分类树走本系统 requestClient（经 /api 代理，result 信封）
 * - 其余中台接口（视频平台、过车、气象）先调用 /device/deviceToken
 *   获取联调地址与访问令牌，然后直连该地址调用，令牌由后端接口
 *   下发，按对接文档约束不写入 URL、源码或日志
 */
import {requestClient} from '#/api/request';

// region 中台联调配置（地址 + 令牌）

/** /device/deviceToken 返回结构（字段名以后端实际返回为准，此处做兼容解析） */
interface EquipTokenResult {
  accessToken?: string;
  address?: string;
  baseUrl?: string;
  serverUrl?: string;
  token?: string;
  url?: string;
}

const equipConfig = { baseUrl: '', token: '' };
let equipConfigPromise: null | Promise<void> = null;

/**
 * 获取中台联调地址与访问令牌（带缓存）
 *
 * @param forceRefresh 强制刷新，用于令牌失效（401）后重新获取
 */
export function loadEquipConfig(forceRefresh = false): Promise<void> {
  if (forceRefresh || !equipConfigPromise) {
    equipConfigPromise = requestClient
      .get<EquipTokenResult>('/device/deviceToken')
      .then((result) => {
        equipConfig.baseUrl = String(result?.baseUrl).replace(/\/+$/, '');
        equipConfig.token = String(result?.token);
      })
      .catch((error) => {
        // 失败后清除缓存，允许后续接口调用时重新获取
        equipConfigPromise = null;
        throw error;
      });
  }
  return equipConfigPromise;
}

// endregion

/** 中台接口请求封装（参考对接文档第 9 章），错误对象附带 HTTP status */
async function equipRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  await loadEquipConfig();

  const doFetch = () =>
    fetch(`${equipConfig.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${equipConfig.token}`,
        ...(init.headers as Record<string, string>),
      },
    });

  let response = await doFetch();
  // 令牌过期（401）时刷新联调配置并重试一次
  if (response.status === 401) {
    await loadEquipConfig(true);
    response = await doFetch();
  }

  const payload: any = await response.json().catch(() => undefined);

  if (!response.ok || payload?.code !== 200) {
    throw Object.assign(
      new Error(
        payload?.error?.message ??
          payload?.message ??
          payload?.detail?.[0]?.msg ??
          `请求失败（HTTP ${response.status}）`,
      ),
      { payload, status: response.status },
    );
  }

  return (payload.data ?? payload.result) as T;
}

function toQuery(params: Record<string, any>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value));
    }
  }
  return search.toString();
}

// region 设备分类树（本系统接口）

export interface DeviceTreeItem {
  id: number;
  deviceName: string;
  simNo?: string;
  purpose?: string;
  purposeName?: string;
  location?: string;
  manager?: string;
  managerPhone?: string;
  vendor?: string;
  status?: string;
  longitude?: number;
  latitude?: number;
  /** FLV 视频流地址（实时视频播放使用） */
  videoUrl?: string;
  online?: boolean;
}

export interface DeviceTreeGroup {
  purpose: string;
  purposeName?: string;
  onlineNum: number;
  totalNum: number;
  children?: DeviceTreeItem[];
}

// endregion

// region 第三方视频平台接口

export interface PlatformCamera {
  id: number;
  equipment_no: string;
  camera_serial: string;
  camera_code: string;
  camera_name: string;
  status: string;
  ptztype: number;
}

/** 相机三要素 */
export interface CameraKeyParams {
  equipment_no: string;
  camera_serial: string;
  camera_code: string;
}

export interface RecordingSegment {
  start_time: string;
  end_time: string;
  name?: string;
}

export interface StreamResult {
  /** 带短期签名的播放地址，播放器必须使用该地址（HLS 请求无需携带 Token） */
  streamUrl: string;
  rawStreamUrl?: string;
}

// endregion

// region 气象与过车数据查询

export interface VehiclePassRecord {
  id: number;
  equipmentNo?: string;
  carNumber?: string;
  shotTime?: string;
  trueSpeed?: number;
  vehicleType?: number;
  vehicleTypeName?: string;
  vehicleColor?: number;
  vehicleColorName?: string;
  plateColor?: number;
  plateColorName?: string;
  /** 车辆抓拍图片（base64 data URL，可能为 null） */
  imgUrl?: null | string;
  addTime?: string;
  createTime?: string;
}

interface PageResult<T> {
  records?: T[];
  total?: number;
  size?: number;
  current?: number;
  pages?: number;
}

// endregion

/** 相机列表 */
export function getCamerasApi() {
  return equipRequest<PlatformCamera[]>(
    '/api/video-platform/cameras?page=1&page_limit=100',
  );
}

/** 设备分类树 */
export function getDeviceTreeApi() {
  return requestClient.get<DeviceTreeGroup[]>('/device/queryTree');
}

/** 过车记录 */
export function getVehiclePassListApi(params: {
  carNumber?: string;
  endTime?: string;
  equipmentNo?: string;
  pageNo?: number;
  pageSize?: number;
  plateColor?: number | string;
  startTime?: string;
  vehicleType?: number | string;
}) {
  return equipRequest<PageResult<VehiclePassRecord>>(
    `/api/vehicle/pass/list?${toQuery(params)}`,
  );
}

/** 气象站监测数据（字段以后端实际推送为准） */
export interface WeatherStationRecord {
  station_id?: string;
  station_name?: string;
  temperature?: number;
  humidity?: number;
  wind_speed?: number;
  weather?: string;
  pressure?: number;
  wind_direction?: number | string;
  snapshot_time?: string;
}

/** 气象数据：data 直接为数组，按需取第一条展示 */
export function getWeatherListApi(params: {
  clientId?: string;
  endTime?: string;
  pageNo?: number;
  pageSize?: number;
  startTime?: string;
}) {
  return equipRequest<WeatherStationRecord[]>(
    `/api/weather/list?${toQuery(params)}`,
  );
}

/** 播放地址处理：相对地址补全中台联调地址前缀 */
export function resolveStreamUrl(streamUrl: string): string {
  if (/^https?:\/\//.test(streamUrl)) {
    return streamUrl;
  }
  return `${equipConfig.baseUrl}${streamUrl}`;
}

/**
 * 资源地址处理（抓拍图片等）：
 * data:/blob:/绝对地址原样返回，相对地址补全中台联调地址前缀
 */
export function resolveEquipUrl(url?: null | string): string {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) {
    return url;
  }
  const base = equipConfig.baseUrl;
  if (!base) return url;
  return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
}

/** 开始实况：返回带短期签名的 HLS 播放地址（streamUrl） */
export function startLiveApi(data: CameraKeyParams) {
  return equipRequest<StreamResult>('/api/video-platform/live/start', {
    body: JSON.stringify(data),
    method: 'POST',
  });
}

/** 查询录像 */
export function searchRecordingsApi(
  data: CameraKeyParams & { end_time: string; start_time: string },
) {
  return equipRequest<{ recordList?: RecordingSegment[] }>(
    '/api/video-platform/recordings/search',
    { body: JSON.stringify(data), method: 'POST' },
  );
}

/** 开始录像回放 */
export function startPlaybackApi(
  data: CameraKeyParams & { end_time: string; start_time: string },
) {
  return equipRequest<StreamResult>('/api/video-platform/playback/start', {
    body: JSON.stringify(data),
    method: 'POST',
  });
}

/** 停止实况：尽力调用，即使失败也必须清理本地播放器状态 */
export function stopLiveApi(data: CameraKeyParams) {
  return equipRequest<unknown>('/api/video-platform/live/stop', {
    body: JSON.stringify(data),
    method: 'POST',
  });
}

// endregion

// region 海康威视（Hikiot）接口

/** play/init / batch-init 返回的设备接入聚合数据 */
export interface HikiotPlayInit {
  bSecret?: string;
  openAppkey?: string;
  openAppSecret?: string;
  appAccessToken?: string;
  userAccessToken?: string;
  windowMode?: number;
  ezAccessData?: string;
  resourcesData?: string;
  tokensData?: string;
  capacitysData?: string;
  ezvizAddr?: string;
  authAddr?: string;
  openAddr?: string;
}

export interface HikiotChannel {
  channelNo: number;
  status: null | number | string;
}

/** 海康实况初始化：返回本地 WEB 插件绘制所需聚合数据 */
export function getHikiotPlayInit(
  deviceSerial: string,
  channelNo = 1,
) {
  return equipRequest<HikiotPlayInit>(
    `/api/hikiot/play/init?${toQuery({ deviceSerial, channelNo })}`,
  );
}

/** 海康通道列表 */
export function getHikiotChannels(deviceSerial: string) {
  return equipRequest<{ channelList?: HikiotChannel[] }>(
    `/api/hikiot/channels?${toQuery({ deviceSerial })}`,
  );
}

// endregion
