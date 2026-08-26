<script lang="ts" setup>
import type {
  DeviceTreeGroup,
  DeviceTreeItem,
  PlatformCamera,
  RecordingSegment,
  VehiclePassRecord,
} from './data';

import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue';

import { IconifyIcon } from '@vatic/icons';

import {
  Button,
  DatePicker,
  Image,
  message,
  Modal,
  Table,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  getCamerasApi,
  getDeviceTreeApi,
  getVehiclePassListApi,
  getWeatherListApi,
  loadEquipConfig,
  resolveEquipUrl,
  resolveStreamUrl,
  searchRecordingsApi,
  startLiveApi,
  startPlaybackApi,
  stopLiveApi,
} from './data';

const { RangePicker } = DatePicker;

// region 页签
type TabKey = 'data' | 'playback' | 'real';

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'real', label: '实时视频' },
  { key: 'playback', label: '回放视频' },
  { key: 'data', label: '数据详情' },
];
const activeTab = ref<TabKey>('real');
// endregion

// region 左侧设备分类
const deviceLoading = ref(false);
const deviceGroups = ref<DeviceTreeGroup[]>([]);
const expandedPurposes = ref<string[]>([]);
const selectedDevice = ref<DeviceTreeItem | null>(null);

function purposeMeta(purpose?: string): { icon: string; iconClass: string } {
  if (purpose?.includes('弯道')) {
    return { icon: 'mdi:road-variant', iconClass: 'text-orange-500' };
  }
  if (purpose?.includes('气象')) {
    return { icon: 'mdi:weather-partly-cloudy', iconClass: 'text-sky-500' };
  }
  if (purpose?.includes('路面')) {
    return { icon: 'mdi:cctv', iconClass: 'text-blue-600' };
  }
  return { icon: 'mdi:video', iconClass: 'text-blue-600' };
}

const groupList = computed(() =>
  deviceGroups.value.map((group) => ({
    ...group,
    meta: purposeMeta(group.purpose),
  })),
);

function isGroupExpanded(purpose: string) {
  return expandedPurposes.value.includes(purpose);
}

function toggleGroup(purpose: string) {
  expandedPurposes.value = isGroupExpanded(purpose)
    ? expandedPurposes.value.filter((item) => item !== purpose)
    : [...expandedPurposes.value, purpose];
}

async function loadDeviceTree() {
  deviceLoading.value = true;
  try {
    deviceGroups.value = (await getDeviceTreeApi()) ?? [];
  } catch {
    // 错误提示由全局响应拦截器统一处理
  } finally {
    deviceLoading.value = false;
  }
}
// endregion

// region 中台接口统一错误处理
/**
 * 中台接口统一错误处理
 * 401 时 equipRequest 内部已自动刷新令牌并重试一次，
 * 仍失败说明令牌彻底失效，提示联系管理员
 */
function handleEquipError(error: any) {
  const status = error?.status;
  if (status === 401) {
    message.error('访问令牌无效或已过期，请联系管理员重新分配');
  } else if (status === 503) {
    message.error('认证服务暂时不可用，请稍后重试');
  } else {
    message.error(error?.message ?? '请求失败');
  }
}
// endregion

// region 流播放工具
let hlsPromise: null | Promise<any> = null;

/** 按需从 CDN 加载 hls.js（仅 HLS 流需要） */
function loadHls(): Promise<any> {
  const w = window as any;
  if (w.Hls) {
    return Promise.resolve(w.Hls);
  }
  hlsPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js';
    script.addEventListener('load', () => resolve((window as any).Hls));
    script.onerror = () => {
      hlsPromise = null;
      reject(new Error('hls.js 播放器加载失败'));
    };
    document.head.append(script);
  });
  return hlsPromise;
}

/**
 * 将视频流挂载到 video 元素，返回清理函数
 * HLS 流（.m3u8）使用 hls.js，FLV 流使用全局 flvjs
 */
async function attachStream(
  video: HTMLVideoElement,
  url: string,
): Promise<() => void> {
  if (url.includes('.m3u8')) {
    const Hls = await loadHls();
    if (Hls?.isSupported?.()) {
      const hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
      return () => hls.destroy();
    }
    // Safari 等支持原生 HLS 的浏览器
    video.src = url;
    video.play();
    return () => {
      video.removeAttribute('src');
      video.load();
    };
  }

  const flvjs = (window as any).flvjs;
  if (!flvjs?.isSupported?.()) {
    throw new Error('当前浏览器不支持 FLV 视频播放');
  }
  const player = flvjs.createPlayer(
    { isLive: false, type: 'flv', url },
    { lazyLoadMaxDuration: 600, stashInitialSize: 128 },
  );
  player.attachMediaElement(video);
  player.load();
  player.play();
  return () => {
    try {
      player.pause();
      player.unload();
      player.detachMediaElement();
      player.destroy();
    } catch (error) {
      console.warn('销毁视频播放器失败', error);
    }
  };
}
// endregion

// region 实时视频
const liveVideoRef = ref<HTMLVideoElement>();
const liveTip = ref('');
const liveLoading = ref(false);
let liveCleanup: (() => void) | null = null;
let liveCamera: null | PlatformCamera = null;

/**
 * 销毁实况播放器：先清理本地播放器状态，
 * 再尽力调用停止实况接口通知上游（失败不影响本地清理）
 */
function destroyLivePlayer() {
  liveCleanup?.();
  liveCleanup = null;
  const camera = liveCamera;
  liveCamera = null;
  if (camera) {
    stopLiveApi({
      camera_code: camera.camera_code,
      camera_serial: camera.camera_serial,
      equipment_no: camera.equipment_no,
    }).catch(() => {});
  }
}

async function playLive() {
  destroyLivePlayer();
  liveTip.value = '';
  const device = selectedDevice.value;
  if (!device) return;

  liveLoading.value = true;
  try {
    const camera = await findCamera(device);
    liveCamera = camera;
    if (!camera) {
      liveTip.value = `【${device.deviceName}】未接入视频平台，暂无实时视频`;
      return;
    }
    const data = await startLiveApi({
      camera_code: camera.camera_code,
      camera_serial: camera.camera_serial,
      equipment_no: camera.equipment_no,
    });
    const streamUrl = data?.streamUrl;
    if (!streamUrl) {
      liveTip.value = `【${device.deviceName}】未获取到实时视频流地址`;
      return;
    }
    await nextTick();
    const video = liveVideoRef.value;
    if (!video) return;
    liveCleanup = await attachStream(video, resolveStreamUrl(streamUrl));
  } catch (error: any) {
    handleEquipError(error);
    liveTip.value = `【${device.deviceName}】实时视频加载失败`;
  } finally {
    liveLoading.value = false;
  }
}
// endregion

// region 回放视频
const playbackVideoRef = ref<HTMLVideoElement>();
const playbackRange = ref<[string, string] | null>(null);
const playbackLoading = ref(false);
const playbackTip = ref('');
const playbackStatus = ref('');
const playbackStreamReady = ref(false);
const recordings = ref<RecordingSegment[]>([]);
const activeRecording = ref<null | RecordingSegment>(null);
let playbackCleanup: (() => void) | null = null;
let camerasCache: null | PlatformCamera[] = null;
let currentCamera: null | PlatformCamera = null;

const playbackPlaceholder = computed(() =>
  selectedDevice.value
    ? `【${selectedDevice.value.deviceName}】选择回放时间段后查询回放视频`
    : '选择设备，填写回放时间段后查询回放视频',
);

function destroyPlaybackPlayer() {
  playbackCleanup?.();
  playbackCleanup = null;
  playbackStreamReady.value = false;
}

/** 通过设备序列号（simNo）匹配视频平台相机 */
async function findCamera(device: DeviceTreeItem) {
  if (!camerasCache) {
    const data = await getCamerasApi();
    camerasCache = Array.isArray(data) ? data : [];
  }
  return (
    camerasCache.find((camera) => camera.equipment_no === device.simNo) ?? null
  );
}

async function queryPlayback() {
  const device = selectedDevice.value;
  playbackTip.value = '';
  if (!device) {
    playbackTip.value = '请先在左侧选择设备';
    return;
  }
  if (!playbackRange.value?.[0] || !playbackRange.value?.[1]) {
    playbackTip.value = '请填写回放开始时间与结束时间';
    return;
  }
  const [startTime, endTime] = playbackRange.value;
  if (!dayjs(startTime).isBefore(dayjs(endTime))) {
    playbackTip.value = '开始时间不能大于或等于结束时间';
    return;
  }

  playbackLoading.value = true;
  destroyPlaybackPlayer();
  recordings.value = [];
  activeRecording.value = null;
  playbackStatus.value = `正在查询【${device.deviceName}】回放录像...`;
  try {
    const camera = await findCamera(device);
    currentCamera = camera;
    if (!camera) {
      playbackStatus.value = `【${device.deviceName}】未接入视频平台，暂无回放`;
      return;
    }
    const data = await searchRecordingsApi({
      camera_code: camera.camera_code,
      camera_serial: camera.camera_serial,
      end_time: endTime,
      equipment_no: camera.equipment_no,
      start_time: startTime,
    });
    recordings.value = data?.recordList ?? [];
    playbackStatus.value =
      recordings.value.length > 0
        ? '请在下方选择回放片段进行播放'
        : `【${device.deviceName}】该时间段内暂无回放录像`;
  } catch (error: any) {
    handleEquipError(error);
    playbackStatus.value = '回放查询失败';
  } finally {
    playbackLoading.value = false;
  }
}

async function playRecording(recording: RecordingSegment) {
  if (!currentCamera) return;
  activeRecording.value = recording;
  destroyPlaybackPlayer();
  playbackStatus.value = `正在加载回放：${formatTime(recording.start_time)} ~ ${formatTime(
    recording.end_time,
  )}`;
  try {
    const data = await startPlaybackApi({
      camera_code: currentCamera.camera_code,
      camera_serial: currentCamera.camera_serial,
      end_time: recording.end_time,
      equipment_no: currentCamera.equipment_no,
      start_time: recording.start_time,
    });
    const streamUrl = data?.streamUrl;
    if (!streamUrl) {
      playbackStatus.value = '未获取到回放流地址';
      return;
    }
    const video = playbackVideoRef.value;
    if (!video) return;
    playbackStatus.value = '';
    playbackCleanup = await attachStream(video, resolveStreamUrl(streamUrl));
    playbackStreamReady.value = true;
  } catch (error: any) {
    handleEquipError(error);
    playbackStatus.value = '回放播放失败';
  }
}
// endregion

// region 数据详情
const detailLoading = ref(false);
const vehicleRecords = ref<VehiclePassRecord[]>([]);
const vehicleTotal = ref(0);
const vehiclePage = reactive({ pageNo: 1, pageSize: 10 });
const weatherRecords = ref<Array<Record<string, any>>>([]);

const detailKind = computed<'none' | 'vehicle' | 'weather'>(() => {
  const purpose = selectedDevice.value?.purpose ?? '';
  if (purpose.includes('弯道')) {
    return 'vehicle';
  }
  if (purpose.includes('气象')) {
    return 'weather';
  }
  return 'none';
});

/** 气象设备仅有数据详情页签 */
const visibleTabs = computed(() =>
  detailKind.value === 'weather'
    ? tabs.filter((tab) => tab.key === 'data')
    : tabs,
);

const vehicleColumns = [
  { title: '车辆号', dataIndex: 'carNumber', key: 'carNumber' },
  { title: '车辆颜色', dataIndex: 'vehicleColorName', key: 'vehicleColorName' },
  { title: '车辆类型', dataIndex: 'vehicleTypeName', key: 'vehicleTypeName' },
  { title: '地点', key: 'location' },
  { title: '时间', key: 'shotTime' },
  { title: '操作', key: 'action', width: 80 },
];

const vehiclePagination = computed(() => ({
  current: vehiclePage.pageNo,
  pageSize: vehiclePage.pageSize,
  showSizeChanger: false,
  showTotal: (total: number) => `共 ${total} 条`,
  total: vehicleTotal.value,
}));

const weatherFieldLabels: Record<string, string> = {
  createTime: '入库时间',
  detectedTime: '检测时间',
  humidity: '湿度(%RH)',
  pressure: '气压(Pa)',
  rainfall: '雨量(mm)',
  temperature: '温度(℃)',
  visibility: '能见度(m)',
  wind_direction: '风向',
  windDirection: '风向',
  wind_speed: '风速(m/s)',
  windSpeed: '风速(m/s)',
};

/** 气象站推送字段动态展平，列以首条记录的字段为准 */
const weatherColumns = computed(() => {
  const first = weatherRecords.value[0];
  if (!first) return [];
  return Object.keys(first)
    .filter((key) => !['clientId', 'id'].includes(key))
    .map((key) => ({
      dataIndex: key,
      key,
      title: weatherFieldLabels[key] ?? key,
    }));
});

const weatherDisplayRecords = computed(() =>
  weatherRecords.value.map((record) => ({
    ...record,
    createTime: formatTime(record.createTime),
    detectedTime: formatTime(record.detectedTime),
  })),
);

async function loadDataDetails(pageNo = 1) {
  const device = selectedDevice.value;
  if (!device || detailKind.value === 'none') return;

  detailLoading.value = true;
  try {
    if (detailKind.value === 'vehicle') {
      vehiclePage.pageNo = pageNo;
      const data = await getVehiclePassListApi({
        equipmentNo: device.simNo,
        pageNo,
        pageSize: vehiclePage.pageSize,
      });
      vehicleRecords.value = data?.records ?? [];
      vehicleTotal.value = data?.total ?? 0;
    } else {
      const data = await getWeatherListApi({
        clientId: device.simNo,
        pageNo: 1,
        pageSize: 100,
      });
      weatherRecords.value = data?.records ?? [];
    }
  } catch (error: any) {
    handleEquipError(error);
  } finally {
    detailLoading.value = false;
  }
}

function handleVehicleTableChange(pagination: any) {
  loadDataDetails(pagination.current);
}
// endregion

// region 车辆抓拍图片弹窗
const carImageVisible = ref(false);
const currentVehicle = ref<null | VehiclePassRecord>(null);

/** 抓拍图片地址：相对路径补全中台联调地址前缀 */
const currentVehicleImageUrl = computed(() =>
  resolveEquipUrl(currentVehicle.value?.imgUrl),
);

function showVehicleImage(record: VehiclePassRecord) {
  currentVehicle.value = record;
  carImageVisible.value = true;
}
// endregion

/** 时间显示格式化：2026-08-24T09:00:00 -> 2026-08-24 09:00:00 */
function formatTime(value?: null | string) {
  if (!value) return '-';
  return value.replace('T', ' ').slice(0, 19);
}

// region 设备选择与生命周期
function selectDevice(device: DeviceTreeItem) {
  if (selectedDevice.value?.id === device.id) return;
  selectedDevice.value = device;

  // 切换设备时清理播放与数据状态
  destroyLivePlayer();
  destroyPlaybackPlayer();
  recordings.value = [];
  activeRecording.value = null;
  currentCamera = null;
  playbackTip.value = '';
  playbackStatus.value = '';
  vehicleRecords.value = [];
  vehicleTotal.value = 0;
  vehiclePage.pageNo = 1;
  weatherRecords.value = [];

  if (detailKind.value === 'weather') {
    // 气象设备仅有数据详情页签，自动切换并加载
    const wasDataTab = activeTab.value === 'data';
    activeTab.value = 'data';
    // 页签未变化时 watch 不会触发，需手动加载
    if (wasDataTab) {
      loadDataDetails(1);
    }
  } else if (activeTab.value === 'real') {
    playLive();
  } else if (activeTab.value === 'data') {
    loadDataDetails(1);
  }
}

watch(activeTab, (tab) => {
  // 离开播放页签时销毁播放器，避免后台继续拉流
  destroyLivePlayer();
  destroyPlaybackPlayer();
  if (tab === 'real') {
    playLive();
  } else if (
    tab === 'data' &&
    selectedDevice.value &&
    detailKind.value !== 'none' &&
    vehicleRecords.value.length === 0 &&
    weatherRecords.value.length === 0
  ) {
    loadDataDetails(1);
  }
});

onMounted(() => {
  loadDeviceTree();
  // 预加载中台联调地址与令牌，失败会在后续接口调用时自动重试
  loadEquipConfig().catch(() => {
    // 错误提示由全局响应拦截器统一处理
  });
});

onBeforeUnmount(() => {
  destroyLivePlayer();
  destroyPlaybackPlayer();
});
// endregion
</script>

<template>
  <div class="flex h-full w-full overflow-hidden bg-gray-100 p-4">
    <!-- 左侧设备分类区域 -->
    <div class="flex w-72 flex-col border-r border-gray-200 bg-white shadow-sm">
      <div class="border-b border-gray-200 p-4">
        <h2 class="flex items-center text-lg font-bold text-gray-800">
          <IconifyIcon
            class="text-primary mr-2"
            icon="mdi:format-list-bulleted"
          />
          设备分类
        </h2>
      </div>
      <div class="scrollbar-hide flex-1 overflow-y-auto p-3">
        <div
          v-if="deviceLoading"
          class="py-10 text-center text-sm text-gray-400"
        >
          设备加载中...
        </div>
        <div
          v-else-if="groupList.length === 0"
          class="py-10 text-center text-sm text-gray-400"
        >
          暂无设备数据
        </div>
        <template v-else>
          <div
            v-for="group in groupList"
            :key="group.purpose"
            class="mb-3 rounded-lg border border-gray-200"
          >
            <div
              class="flex cursor-pointer items-center justify-between rounded-t-lg bg-gray-50 px-3 py-3"
              @click="toggleGroup(group.purpose)"
            >
              <div class="flex items-center">
                <IconifyIcon
                  :class="group.meta.iconClass"
                  class="mr-2"
                  :icon="group.meta.icon"
                />
                <span class="font-medium">{{
                  group.purposeName || group.purpose
                }}</span>
                <IconifyIcon
                  :icon="
                    isGroupExpanded(group.purpose)
                      ? 'mdi:chevron-up'
                      : 'mdi:chevron-down'
                  "
                  class="ml-1 text-xs text-gray-400"
                />
              </div>
              <div class="text-xs text-gray-500">
                总数:{{ group.totalNum }}｜在线:{{ group.onlineNum }}
              </div>
            </div>
            <div
              v-show="isGroupExpanded(group.purpose)"
              class="bg-white px-3 py-2"
            >
              <div
                v-for="device in group.children ?? []"
                :key="device.id"
                class="flex cursor-pointer items-center rounded px-2 py-2 text-sm hover:bg-blue-50"
                :class="{ 'bg-blue-100': selectedDevice?.id === device.id }"
                @click="selectDevice(device)"
              >
                <span
                  class="mr-2 inline-block h-2 w-2 flex-none rounded-full"
                  :class="device.online ? 'bg-green-500' : 'bg-gray-300'"
                ></span>
                <span class="truncate">{{ device.deviceName }}</span>
              </div>
              <div
                v-if="!group.children?.length"
                class="px-2 py-2 text-center text-xs text-gray-400"
              >
                暂无设备
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- 右侧主内容区域 -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <div
        class="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-3"
      >
        <div>
          <span class="text-gray-500">当前选中设备：</span>
          <span class="text-primary font-medium">
            {{ selectedDevice?.deviceName ?? '请在左侧选择设备' }}
          </span>
          <span
            v-if="selectedDevice"
            class="ml-2 text-xs"
            :class="selectedDevice.online ? 'text-green-600' : 'text-gray-400'"
          >
            {{ selectedDevice.online ? '在线' : '离线' }}
          </span>
        </div>
      </div>

      <div class="flex-1 overflow-auto p-4">
        <div class="mb-4 rounded-lg bg-white shadow-sm">
          <!-- 视频tab区域 -->
          <div class="flex border-b border-gray-200">
            <div
              v-for="tab in visibleTabs"
              :key="tab.key"
              class="border-b-2 px-5 py-3 font-medium"
              :class="[
                selectedDevice ? 'cursor-pointer' : 'cursor-not-allowed',
                activeTab === tab.key && selectedDevice
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-400',
              ]"
              @click="selectedDevice && (activeTab = tab.key)"
            >
              {{ tab.label }}
            </div>
          </div>

          <div class="p-4">
            <!-- 实时视频 -->
            <div v-show="activeTab === 'real'">
              <div
                class="relative flex h-[360px] items-center justify-center rounded bg-black text-gray-400"
              >
                <video
                  v-show="selectedDevice && !liveTip && !liveLoading"
                  ref="liveVideoRef"
                  autoplay
                  class="h-full w-full object-contain"
                  controls
                  muted
                ></video>
                <div v-if="!selectedDevice">请选择左侧设备查看实时视频</div>
                <div v-else-if="liveLoading">正在加载实时视频...</div>
                <div v-else-if="liveTip">{{ liveTip }}</div>
              </div>
            </div>

            <!-- 回放视频 -->
            <div v-show="activeTab === 'playback'">
              <div class="mb-4 flex flex-wrap items-center gap-3">
                <span class="text-sm text-gray-600">回放时间段：</span>
                <RangePicker
                  v-model:value="playbackRange"
                  show-time
                  value-format="YYYY-MM-DD HH:mm:ss"
                  :placeholder="['开始时间', '结束时间']"
                />
                <Button
                  :loading="playbackLoading"
                  type="primary"
                  @click="queryPlayback"
                >
                  <IconifyIcon class="mr-1" icon="mdi:magnify" />
                  查询回放
                </Button>
                <div v-if="playbackTip" class="text-xs text-orange-500">
                  {{ playbackTip }}
                </div>
              </div>
              <div
                class="relative flex h-[320px] items-center justify-center rounded bg-black text-gray-400"
              >
                <video
                  v-show="playbackStreamReady"
                  ref="playbackVideoRef"
                  autoplay
                  class="h-full w-full object-contain"
                  controls
                  muted
                ></video>
                <div v-if="!playbackStreamReady">
                  {{ playbackStatus || playbackPlaceholder }}
                </div>
              </div>
              <div v-if="recordings.length > 0" class="mt-4">
                <div class="mb-2 text-sm font-medium text-gray-700">
                  回放片段（{{ recordings.length }}）
                </div>
                <div class="flex flex-wrap gap-2">
                  <div
                    v-for="(recording, index) in recordings"
                    :key="index"
                    class="cursor-pointer rounded border px-3 py-1.5 text-xs"
                    :class="
                      activeRecording === recording
                        ? 'border-primary text-primary bg-blue-50'
                        : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
                    "
                    @click="playRecording(recording)"
                  >
                    {{ recording.name || `片段${index + 1}` }}（{{
                      formatTime(recording.start_time)
                    }}
                    ~ {{ formatTime(recording.end_time) }}）
                  </div>
                </div>
              </div>
            </div>

            <!-- 数据详情 -->
            <div v-show="activeTab === 'data'">
              <Table
                v-if="detailKind === 'vehicle'"
                :columns="vehicleColumns"
                :data-source="vehicleRecords"
                :loading="detailLoading"
                :pagination="vehiclePagination"
                row-key="id"
                size="middle"
                @change="handleVehicleTableChange"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'location'">
                    {{ selectedDevice?.location }}
                  </template>
                  <template v-else-if="column.key === 'shotTime'">
                    {{ formatTime(record.shotTime) }}
                  </template>
                  <template v-else-if="column.key === 'action'">
                    <a
                      class="text-primary cursor-pointer"
                      @click="showVehicleImage(record)"
                    >
                      详情
                    </a>
                  </template>
                </template>
              </Table>
              <Table
                v-else-if="detailKind === 'weather'"
                :columns="weatherColumns"
                :data-source="weatherDisplayRecords"
                :loading="detailLoading"
                :pagination="false"
                row-key="id"
                size="middle"
              />
              <div v-else class="py-10 text-center text-gray-400">
                <IconifyIcon
                  class="mb-2 text-2xl"
                  icon="mdi:information-outline"
                />
                <p>当前设备无数据详情（仅弯道预警、气象设备存在数据）</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 车辆图片弹窗 -->
    <Modal
      v-model:open="carImageVisible"
      :footer="null"
      title="车辆抓拍图片"
      :width="520"
    >
      <div class="flex justify-center p-2">
        <Image
          v-if="currentVehicleImageUrl"
          :src="currentVehicleImageUrl"
          class="w-full rounded object-contain"
        />
        <div
          v-else
          class="flex h-72 w-full items-center justify-center rounded bg-gray-100 text-gray-500"
        >
          <div class="text-center">
            <IconifyIcon class="mb-2 text-4xl" icon="mdi:camera" />
            <p>暂无抓拍图片</p>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<style scoped lang="scss">
.scrollbar-hide {
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}
</style>
