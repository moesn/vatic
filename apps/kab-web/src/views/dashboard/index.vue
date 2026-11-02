<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { message } from 'ant-design-vue';

import {
  getDataStatsApi,
  getDeviceListApi,
  getEventStatsApi,
  getTaskStatsApi,
  getWeatherListApi,
} from '#/views/dashboard/data';
import { getEventListApi } from '#/views/event/data';

import styleJson from './style.json';

const router = useRouter();

/** 页面四周背景色：默认取地图底图陆地色，与地图无缝衔接 */
const landColor: string =
  (styleJson.find((s: any) => s.featureType === 'land') as any)?.stylers?.color?.slice(
    0,
    7,
  ) || '#091220';

let timer;
const time = ref();
clearInterval(timer);
timer = setInterval(() => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  time.value = `${hours}:${minutes}:${seconds}`;
}, 1000);

const mapContainer = ref(null);
const videoWidth = ref(0);

// region 统计概览
const statsData = ref<any>({});

function getStatsData() {
  getDataStatsApi().then((res: any) => {
    statsData.value = res;
  });
}

// endregion

// region 风险
const riskTotal = ref<number>(100);
const riskPageSize = ref<number>(0);
const riskPageNo = ref<number>(1);
const riskPages = ref<number>(1);
const eventActive = ref('未派发');
const eventStates: string[] = ['未派发', '待确认', '处理中', '待复核'];
const eventStats = ref<any>([]);
const eventList = ref<any>([]);

function getEventStats() {
  getEventStatsApi().then((res: any) => {
    eventStats.value = eventStates.map((status) => {
      const stat = res.find((d: any) => d.status === status);
      return (
        stat || {
          status,
          eventCount: 0,
        }
      );
    });
  });
}

function getEventList(status: string, pageNo: number) {
  eventActive.value = status;
  riskPageNo.value = pageNo;
  getEventListApi({
    status,
    pageSize: riskPageSize.value,
    pageNo,
  }).then((res: any) => {
    eventList.value = res.records;
    riskPages.value = res.pages;
    riskTotal.value = res.total;
  });
}

watch(riskPageSize, (val) => {
  if (val) {
    getEventList(eventActive.value, 1);
  }
});

// endregion

// region 监控视频
const deviceStoreKey = 'device-to-be-played';
const allDeviceList = ref([]);
const selectedDevices = ref(
  JSON.parse(localStorage.getItem(deviceStoreKey) || '[]'),
);
const settingVisible = ref<boolean>(false);
const handleChange = (devices: any) => {
  if (devices.length > 5) {
    selectedDevices.value = devices.slice(0, 5);
  }
};
const storeDevice = () => {
  if (selectedDevices.value.length > 0) {
    localStorage.setItem(deviceStoreKey, JSON.stringify(selectedDevices.value));
    settingVisible.value = false;
    loadVideo();
  } else {
    message.error('请至少选择1个监控设备！');
  }
};

function getDeviceList() {
  getDeviceListApi().then((res: any) => {
    allDeviceList.value = res;
    if (selectedDevices.value.length === 0) {
      const defaultDevices = res.slice(0, 5).map((d: any) => d.videoUrl);
      selectedDevices.value.push(...defaultDevices);
      storeDevice();
    }
    setTimeout(() => loadVideo());
  });
}

function calcVideoWidth() {
  videoWidth.value =
    (document.querySelector('.right')?.offsetHeight * 168) / (94 * 5) - 30;

  riskPageSize.value = Math.round(
    document.querySelector('.risk')?.offsetHeight / 100,
  );
}

function loadVideo() {
  if (flvjs.isSupported()) {
    const videoElements = document.querySelectorAll('.videoElement');
    videoElements?.forEach((videoElement: any, index: number) => {
      const url = selectedDevices.value[index];
      const player = flvjs.createPlayer(
        {
          type: 'flv',
          isLive: false,
          url,
        },
        {
          lazyLoadMaxDuration: 10 * 60,
          stashInitialSize: 128,
        },
      );
      player.attachMediaElement(videoElement);
      player.load();
      player.pause();
      player.play();
    });
  }
}

function deviceName(videoUrl: string) {
  return allDeviceList.value.find((d: any) => d.videoUrl === videoUrl)
    ?.location;
}

getDeviceList();
// endregion

// region 气候
const weatherList = ref([]);
const weatherIndex = ref(0);
let weatherTimer: null | ReturnType<typeof setInterval> = null;

function getWeatherList() {
  getWeatherListApi().then((res: any) => {
    weatherList.value = res;
    if (weatherTimer) clearInterval(weatherTimer);
    weatherTimer = setInterval(() => {
      if (weatherList.value.length > 1) {
        weatherIndex.value = (weatherIndex.value + 1) % weatherList.value.length;
      }
    }, 3000);
  });
}

// endregion

// region 监控类型（4 类）
const deviceTypes = [
  {
    name: '路面监控',
    online: 'onlineDeviceCount',
    all: 'deviceCount',
    show: true,
  },
  {
    name: '弯道监控',
    online: 'onlineDeviceCount',
    all: 'deviceCount',
    show: true,
  },
  {
    name: '气象监控',
    online: 'onlineDeviceCount',
    all: 'deviceCount',
    show: true,
  },
  {
    name: '车辆监控',
    online: 'onlineDeviceCount',
    all: 'deviceCount',
    show: true,
  },
];

let map: any;
/** 地图是否已加载完成（tilesloaded 后延迟显示，避免中间区域空白/闪烁） */
const mapVisible = ref(false);
let tilesLoadedFlag = false;

function loadHuaXi() {
  const boundary = new BMapGL.Boundary();
  boundary.get('花溪区', (rs: any) => {
    if (rs.boundaries.length === 0) {
      setTimeout(() => loadHuaXi(), 100);
    } else {
      const allPts: any[] = [];
      for (let i = 0; i < rs.boundaries.length; i++) {
        const xyArr = rs.boundaries[i].split(';');
        const ringPts: any[] = [];

        for (const element of xyArr) {
          const tmp = element.split(',');
          const pt = new BMapGL.Point(tmp[0], tmp[1]);
          ringPts.push(pt);
          allPts.push(pt);
        }
        // 闭合边界环（首尾点不同时补首点），保证轮廓线首尾相接
        const first = ringPts[0];
        const last = ringPts[ringPts.length - 1];
        if (
          ringPts.length > 1 &&
          (first.lng !== last.lng || first.lat !== last.lat)
        ) {
          ringPts.push(first);
        }

        // 边界描边：亮青色轮廓线，让区域边界更清晰
        const borderLine = new BMapGL.Polyline(ringPts, {
          strokeColor: '#4be1ff',
          strokeOpacity: 0.9,
          strokeWeight: 2,
        });
        map.addOverlay(borderLine);

        const mapMask = new BMapGL.MapMask(ringPts, {
          isBuildingMask: true,
          isPoiMask: true,
          isMapMask: true,
          showRegion: 'inside',
          topFillColor: '#5679ea',
          topFillOpacity: 0.5,
          sideFillColor: '#5679ea',
          sideFillOpacity: 0.9,
        });

        map.addOverlay(mapMask);
        map.enableDragging();
        map.enableScrollWheelZoom();
      }

      // 视野自动适配到花溪区边界，保证区域完整落在中间地图容器内
      if (allPts.length > 0) {
        map.setViewport(allPts);

        // 拖动限制：以花溪区边界外包矩形为限，拖动/缩放不能超出边界
        const lngs = allPts.map((p: any) => p.lng);
        const lats = allPts.map((p: any) => p.lat);
        const limitBounds = new BMapGL.Bounds(
          new BMapGL.Point(Math.min(...lngs), Math.min(...lats)),
          new BMapGL.Point(Math.max(...lngs), Math.max(...lats)),
        );
        const sw = limitBounds.getSouthWest();
        const ne = limitBounds.getNorthEast();

        // 关闭惯性甩动：按住快速甩动时惯性位移会把视野冲出边界
        map.disableInertialDragging?.();

        // 不用 setLimitBounds：视口大于边界矩形时它会禁用拖动/缩放导致地图卡死；
        // 改为在每次移动结束后把越界的中心点拉回边界内
        map.addEventListener('moveend', () => {
          const { lat, lng } = map.getCenter();
          const clampedLng = Math.min(Math.max(lng, sw.lng), ne.lng);
          const clampedLat = Math.min(Math.max(lat, sw.lat), ne.lat);
          // 与边界比较留出误差容忍，避免浮点误差导致反复 panTo 卡住
          if (
            Math.abs(clampedLng - lng) > 1e-9 ||
            Math.abs(clampedLat - lat) > 1e-9
          ) {
            map.panTo(new BMapGL.Point(clampedLng, clampedLat));
          }
        });
      }

      deviceTypes.forEach((item: any) => createMarkersByType(item.name));
    }
  });
}

/** 清除旧设备标注后按类型重建（定时刷新设备在线状态时复用，避免整张地图重载） */
function refreshMarkers() {
  map.getOverlays().forEach((overlay: any) => {
    if (overlay._config?.type) {
      map.removeOverlay(overlay);
    }
  });
  deviceTypes.forEach((item: any) => createMarkersByType(item.name));
}

function loadMap() {
  // 地图只初始化一次：定时刷新数据时复用已有地图，仅刷新设备标注，
  // 避免整张地图（瓦片/掩膜/边界）销毁重建导致的长时间重新加载
  if (map) {
    refreshMarkers();
    return;
  }
  map = new BMapGL.Map(mapContainer.value, {
    enableMapClick: false,
    enableScrollWheelZoom: false,
    enableAutoResize: true,
  });
  map.disableDragging();
  // 缩放限制：初始 11 级正好容纳花溪区，可放大到 18 级查看细节，不可缩小到区外
  map.setMinZoom(11);
  map.setMaxZoom(18);
  // zoom 12 保证花溪区掩膜完整落在中间地图区域内，掩膜蓝色与四周陆地色有明显区分
  map.centerAndZoom(
    new BMapGL.Point(106.623_548_548_890_23, 26.396_209_157_438_058),
    12,
  );
  map.setMapStyleV2({ styleJson });

  // 监听瓦片加载完成，短延迟后显示地图（仅等首批瓦片，避免长时间空白）
  tilesLoadedFlag = false;
  map.addEventListener('tilesloaded', () => {
    if (tilesLoadedFlag) return;
    tilesLoadedFlag = true;
    setTimeout(() => {
      mapVisible.value = true;
    }, 100);
  });

  document.querySelectorAll('.anchorBL').forEach((el) => el.remove());

  setTimeout(() => loadHuaXi(), 100);
}

/** 手动刷新地图：销毁重建整张地图，用于地图偶发未渲染/瓦片异常时恢复 */
function refreshMap() {
  map?.destroy?.();
  map = null;
  tilesLoadedFlag = false;
  mapVisible.value = false;
  loadMap();
}

function createMarkersByType(type: string) {
  const bodyWidth = document.body.offsetWidth;
  const width = Math.min(bodyWidth * 0.03, 100);
  const height = Math.min(bodyWidth * 0.03, 100);

  allDeviceList.value
    ?.filter((d: any) => d.purpose === type)
    .forEach((item: any) => {
      const icon = new BMapGL.Icon(
        `/assets/image/marker/${type}${item.status || 0}.png`,
        new BMapGL.Size(width, height),
      );
      const pt = new BMapGL.Point(item.longitude, item.latitude);
      const marker = new BMapGL.Marker(pt, { icon, type });
      marker.addEventListener('click', () => {
        if (item.simNo) {
          router.push({ path: '/video', query: { simNo: item.simNo } });
        }
      });
      map.addOverlay(marker);
    });
}

// function deleteMarkersByType(type: string) {
//   map.getOverlays().forEach((overlay: any) => {
//     if (overlay._config?.type === type) {
//       map.removeOverlay(overlay);
//     }
//   });
// }

// function renderMarkers(show: boolean, type: string) {
//   if (show) {
//     createMarkersByType(type);
//   } else {
//     deleteMarkersByType(type);
//   }
// }

// endregion

// region 养护统计
let taskChart;
const colors = (i: number, a: number) =>
  [`rgba(234,74,87,${a})`, `rgba(25,236,255,${a})`][i];
const taskTypes: string[] = ['紧急', '普通'];
const taskStates: string[] = ['待确认', '处理中', '待复核', '已完成'];
const taskData = ref<any>({});

function renderTaskChart() {
  taskChart?.dispose();
  taskChart = echarts.init(document.querySelector('#task-chart'));

  const option = {
    legend: {
      data: taskTypes,
      top: 10,
      textStyle: {
        color: '#FFF',
      },
    },
    grid: {
      left: 70,
      right: 40,
      top: 40,
      bottom: 20,
    },
    xAxis: [
      {
        type: 'value',
        axisLine: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
        splitLine: {
          show: false,
        },
      },
    ],
    yAxis: [
      {
        type: 'category',
        inverse: true,
        axisTick: { show: false },
        data: taskStates,
        axisLine: {
          show: false,
        },
        axisLabel: {
          color: '#FFF',
        },
        splitLine: {
          show: false,
        },
      },
    ],
    series: taskTypes.map((type: string, index: number) => {
      return {
        name: type,
        type: 'bar',
        barWidth: 12,
        barGap: '20%',
        label: {
          show: true,
          position: 'right',
          distance: 5,
          formatter: '{c}',
          fontSize: 14,
          color: '#FFF',
        },
        emphasis: {
          focus: 'series',
        },
        data: taskData.value[type],
        itemStyle: {
          // 横向渐变（从左到右）
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: colors(index, 0.5) },
            { offset: 0.6, color: colors(index, 0.8) },
            { offset: 1, color: colors(index, 1) },
          ]),
          opacity: 0.8,
          emphasis: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      };
    }),
  };
  taskChart.setOption(option, true);
}

function loadTaskChart(init: boolean = false) {
  if (init) {
    getTaskStatsApi().then((res) => {
      taskTypes.forEach((type) => {
        taskData.value[type] = taskStates.map((status) => {
          const stat = res.find(
            (d: any) => d.status === status && d.taskType === type,
          );
          return stat?.count || 0;
        });
      });
      renderTaskChart();
    });
  } else {
    renderTaskChart();
  }
}

// endregion

window.addEventListener('resize', () => {
  calcVideoWidth();
  loadTaskChart();
});

async function reloadData() {
  calcVideoWidth();
  getStatsData();
  getEventStats();
  loadTaskChart(true);
  getWeatherList();
  loadMap();
}

setInterval(() => reloadData(), 60 * 60 * 1000);

onMounted(() => {
  reloadData();
});
</script>
<template>
  <div
    class="h-full w-full"
    :style="{ minWidth: '1700px', background: landColor }"
  >
    <!-- 地图只渲染在两侧面板之间的中间区域，四周背景与地图底图陆地色一致 -->
    <div
      ref="mapContainer"
      class="map-center"
      :class="{ 'map-visible': mapVisible }"
    ></div>
    <!-- 地图右上角：半透明刷新按钮，地图偶发未渲染时可手动重建 -->
    <div
      class="absolute right-[356px] top-[100px] z-50 flex size-8 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white/80 transition hover:bg-white/40"
      title="刷新地图"
      @click="refreshMap"
    >
      <svg class="size-4" viewBox="0 0 24 24" fill="currentColor">
        <path
          d="M17.65 6.35A7.958 7.958 0 0 0 12 4a8 8 0 1 0 8 8h-2a6 6 0 1 1-1.76-4.24L13 11h7V4l-2.35 2.35z"
        />
      </svg>
    </div>
    <div class="absolute top-0 flex h-full w-full justify-between">
      <div class="top-banner">
        <h1>农村公路安全监测预警系统</h1>
        <h2>{{ time }}</h2>
      </div>
      <div class="left">
        <div class="left-top">
          <div class="lt-dash">
            <div v-for="item in deviceTypes" :key="item.name">
              <h3>{{ item.name }}</h3>
              <h3>
                {{ statsData[item.online]?.[item.name] || 0 }}/{{
                  statsData[item.all]?.[item.name] || 0
                }}
              </h3>
              <!--              <Switch-->
              <!--                v-model:checked="item.show"-->
              <!--                @click="() => renderMarkers(item.show, item.name)"-->
              <!--              />-->
            </div>
          </div>
        </div>
        <div class="box-card left-bottom">
          <div class="paging">
            <img
              src="/assets/image/risk/prev.png"
              @click="
                riskPageNo > 1
                  ? getEventList(eventActive, (riskPageNo -= 1))
                  : ''
              "
            />
            <h3>
              {{ (riskPageNo - 1) * riskPageSize }} ~
              {{ Math.min(riskPageNo * riskPageSize, riskTotal) }} /
              {{ riskTotal }}
            </h3>
            <img
              src="/assets/image/risk/next.png"
              @click="
                riskPageNo < riskPages
                  ? getEventList(eventActive, (riskPageNo += 1))
                  : ''
              "
            />
          </div>
          <div class="nav">
            <h3
              v-for="event in eventStats"
              :class="{ active: event.status === eventActive }"
              :key="event.status"
              @click="getEventList(event.status, 1)"
            >
              {{ event.status }}({{ event.eventCount }})
            </h3>
          </div>
          <div class="risk">
            <div v-for="event in eventList" :key="event.id">
              <img :src="event.imageUrl" alt="" />
              <div>
                <h4>{{ event.eventType }}</h4>
                <h5>{{ event.location }}</h5>
                <h5>{{ event.captureTime }}</h5>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="right">
        <div class="box-card right-bottom">
          <div class="weather">
            <template v-if="weatherList[weatherIndex]">
              <div>
                <h3>{{ weatherList[weatherIndex].station_name }}</h3>
              </div>
              <div>
                <img src="/assets/image/weather/temperature.png" alt="" />
                <h3>{{ weatherList[weatherIndex].temperature }}℃</h3>
                <h3>温度</h3>
              </div>
              <div>
                <img src="/assets/image/weather/wet.png" alt="" />
                <h3>{{ weatherList[weatherIndex].humidity }}%RH</h3>
                <h3>湿度</h3>
              </div>
              <div>
                <img src="/assets/image/weather/speed.png" alt="" />
                <h3>{{ weatherList[weatherIndex].wind_speed }}m/s</h3>
                <h3>风速</h3>
              </div>
              <div>
                <img src="/assets/image/weather/direction.png" alt="" />
                <h3>{{ weatherList[weatherIndex].wind_direction }}</h3>
                <h3>风向</h3>
              </div>
              <div>
                <img src="/assets/image/weather/pressure.png" alt="" />
                <h3>{{ weatherList[weatherIndex].pressure }}Pa</h3>
                <h3>气压</h3>
              </div>
            </template>
          </div>
        </div>
        <div class="box-card right-top">
          <div id="task-chart"></div>
        </div>
      </div>
    </div>
  </div>
</template>
<style lang="scss" scoped>
@use './style';
</style>
