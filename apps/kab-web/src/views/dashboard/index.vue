<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';

import { Button, Popover, Select, SelectOption, Switch } from 'ant-design-vue';

import {
  getDataStatsApi,
  getDeviceListApi,
  getEventStatsApi,
  getTaskStatsApi,
  getWeatherListApi,
} from '#/views/dashboard/data';
import { getEventListApi } from '#/views/event/data';

import box from './box.vue';
import styleJson from './style.json';

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
const showCar = ref<boolean>(true);
const showDevice = ref<boolean>(true);

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
  localStorage.setItem(deviceStoreKey, JSON.stringify(selectedDevices.value));
  settingVisible.value = false;
};

function getDeviceList() {
  getDeviceListApi().then((res: any) => {
    allDeviceList.value = res;
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
      const video = selectedDevices.value[index];
      const nameUrl: any = video.split('$');
      const player = flvjs.createPlayer(
        {
          type: 'flv',
          isLive: false,
          url: nameUrl[1],
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

getDeviceList();

watch(selectedDevices, (val) => {
  if (val && val.length > 0) {
    loadVideo();
  }
});
// endregion

// region 气候
const weatherList = ref([]);

function getWeatherList() {
  getWeatherListApi().then((res: any) => {
    weatherList.value = res;
  });
}

// endregion

// region 地图
type MarkerType = 'car' | 'device';

const markers: any = {
  car: [
    {
      jin: 106.623,
      wei: 26.396,
    },
  ],
  device: [
    {
      jin: 106.523,
      wei: 26.386,
    },
  ],
};

let map: any;

function loadHuaXi() {
  const boundary = new BMapGL.Boundary();
  boundary.get('花溪区', (rs: any) => {
    if (rs.boundaries.length === 0) {
      setTimeout(() => loadHuaXi(), 100);
    } else {
      for (let i = 0; i < rs.boundaries.length; i++) {
        const xyArr = rs.boundaries[i].split(';');
        const ptArr = [];

        for (const element of xyArr) {
          const tmp = element.split(',');
          const pt = new BMapGL.Point(tmp[0], tmp[1]);
          ptArr.push(pt);
        }

        const mapMask = new BMapGL.MapMask(ptArr, {
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

        renderMarkers(true, 'car');
        renderMarkers(true, 'device');
      }
    }
  });
}

function loadMap() {
  map = new BMapGL.Map(mapContainer.value, {
    enableMapClick: false,
    enableScrollWheelZoom: false,
    enableAutoResize: true,
  });
  map.disableDragging();
  map.centerAndZoom(
    new BMapGL.Point(106.623_548_548_890_23, 26.396_209_157_438_058),
    13,
  );
  map.setMapStyleV2({ styleJson });

  document.querySelectorAll('.anchorBL').forEach((el) => el.remove());

  setTimeout(() => loadHuaXi(), 100);
}

function createMarkersByType(type: MarkerType) {
  markers[type]?.forEach((item: any) => {
    const icon = new BMapGL.Icon(
      `/assets/image/marker/${type}.png`,
      new BMapGL.Size(50, 50),
    );
    const pt = new BMapGL.Point(item.jin, item.wei);
    const marker = new BMapGL.Marker(pt, { icon, type });
    map.addOverlay(marker);
  });
}

function deleteMarkersByType(type: MarkerType) {
  map.getOverlays().forEach((overlay: any) => {
    if (overlay._config?.type === type) {
      map.removeOverlay(overlay);
    }
  });
}

function renderMarkers(show: boolean, type: MarkerType) {
  if (show) {
    createMarkersByType(type);
  } else {
    deleteMarkersByType(type);
  }
}

watch(showCar, (val) => {
  renderMarkers(val, 'car');
});

watch(showDevice, (val) => {
  renderMarkers(val, 'device');
});
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
      left: 20,
      right: 20,
      top: 50,
      bottom: 50,
    },
    xAxis: [
      {
        type: 'category',
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
    yAxis: [
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
    series: taskTypes.map((type: string, index: number) => {
      return {
        name: type,
        type: 'bar',
        barWidth: 20,
        barGap: '20%',
        label: {
          show: true,
          position: 'insideBottom',
          distance: 10,
          align: 'left',
          verticalAlign: 'middle',
          rotate: 90,
          formatter: '{c}',
          fontSize: 16,
          color: '#FFF',
          rich: {
            name: {},
          },
        },
        emphasis: {
          focus: 'series',
        },
        data: taskData.value[type],
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
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
  <div class="h-full w-full" style="min-width: 1700px">
    <div ref="mapContainer" class="h-full w-full"></div>
    <div class="absolute top-0 flex h-full w-full justify-between">
      <div class="top-banner">
        <h1>XXXX管理平台</h1>
        <h2>{{ time }}</h2>
      </div>
      <div class="left">
        <div class="box-card left-top">
          <box />
          <h2>统计概览</h2>
          <div class="lt-stats-dash">
            <h3>路产数量</h3>
            <h3>风险事件</h3>
            <h4>{{ `0000${statsData.regionCount || 0}`.slice(-4) }}</h4>
            <h4>{{ `0000${statsData.riskEventCount || 0}`.slice(-4) }}</h4>
          </div>
          <div class="lt-dash">
            <div>
              <h3>人员({{ statsData.staffCount }})</h3>
              <h3>桥梁({{ statsData.bridgeCount }})</h3>
              <h3>边坡({{ statsData.slopeCount }})</h3>
            </div>
            <div>
              <h3>养护车辆</h3>
              <h3>{{ statsData.onlineCarCount }}/{{ statsData.carCount }}</h3>
              <Switch v-model:checked="showCar" />
            </div>
            <div>
              <h3>视频监控</h3>
              <h3>
                {{ statsData.onlineDeviceCount }}/{{ statsData.deviceCount }}
              </h3>
              <Switch v-model:checked="showDevice" />
            </div>
          </div>
        </div>
        <div class="box-card left-bottom">
          <box />
          <h2>风险</h2>
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
              <img src="/test.png" alt="" />
              <div>
                <h4>{{ event.eventType }}</h4>
                <h5>{{ event.location }}</h5>
                <h5>{{ event.captureTime }}</h5>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="right" :style="{ width: `${videoWidth}px` }">
        <template v-for="(device, index) in selectedDevices" :key="device.id">
          <Popover
            placement="left"
            v-if="index === 0"
            v-model:open="settingVisible"
            trigger="click"
          >
            <template #content>
              <Select
                v-model:value="selectedDevices"
                mode="multiple"
                style="width: 300px"
                placeholder="请选择5个要播放的监控设备"
                @change="handleChange"
              >
                <SelectOption
                  v-for="item in allDeviceList"
                  :key="item.id"
                  :value="`${item.name}$${item.videoUrl}`"
                  :disabled="
                    selectedDevices.length >= 5 &&
                    !selectedDevices.includes(`${item.name}$${item.videoUrl}`)
                  "
                >
                  {{ item.name }}
                </SelectOption>
              </Select>
              <Button @click="storeDevice()">保存</Button>
            </template>
            <img src="/assets/image/setting.png" alt="" />
            <h2 v-if="selectedDevices.length === 0">请设置要播放的监控设备</h2>
          </Popover>
          <h1>{{ device.split('$')[0] }}</h1>
          <video class="videoElement" autoplay muted></video>
        </template>
      </div>
      <div
        class="bottom"
        :style="{ width: `calc(100% - ${videoWidth + 480}px)` }"
      >
        <div class="box-card bottom-left">
          <box />
          <h2>养护任务统计</h2>
          <div id="task-chart"></div>
        </div>
        <div class="box-card bottom-right">
          <box />
          <h2>气象监控设备</h2>
          <div class="weather">
            <div v-if="weatherList[0]">
              <div>
                <h3>{{ weatherList[0].location }}</h3>
                <span></span>
              </div>
              <div>
                <img src="/assets/image/weather/temperature.png" alt="" />
                <h3>{{ weatherList[0].temperature }}℃</h3>
                <h3>温</h3>
              </div>
              <div>
                <img src="/assets/image/weather/wet.png" alt="" />
                <h3>{{ weatherList[0].humidity }}%RH</h3>
                <h3>湿</h3>
              </div>
              <div>
                <img src="/assets/image/weather/speed.png" alt="" />
                <h3>{{ weatherList[0].wind_speed }}m/s</h3>
                <h3>风</h3>
              </div>
              <div>
                <img src="/assets/image/weather/direction.png" alt="" />
                <h3>{{ weatherList[0].wind_direction }}</h3>
                <h3>风</h3>
              </div>
              <div>
                <img src="/assets/image/weather/pressure.png" alt="" />
                <h3>{{ weatherList[0].air_pressure }}Pa</h3>
                <h3>气</h3>
              </div>
            </div>
            <div v-if="weatherList[1]">
              <div>
                <span></span>
                <h3>{{ weatherList[0].location }}</h3>
              </div>
              <div>
                <h3>度</h3>
                <h3>{{ weatherList[0].temperature }}℃</h3>
                <img src="/assets/image/weather/temperature.png" alt="" />
              </div>
              <div>
                <h3>度</h3>
                <h3>{{ weatherList[0].humidity }}%RH</h3>
                <img src="/assets/image/weather/wet.png" alt="" />
              </div>
              <div>
                <h3>速</h3>
                <h3>{{ weatherList[0].wind_speed }}m/s</h3>
                <img src="/assets/image/weather/speed.png" alt="" />
              </div>
              <div>
                <h3>向</h3>
                <h3>{{ weatherList[0].wind_direction }}</h3>
                <img src="/assets/image/weather/direction.png" alt="" />
              </div>
              <div>
                <h3>压</h3>
                <h3>{{ weatherList[0].air_pressure }}Pa</h3>
                <img src="/assets/image/weather/pressure.png" alt="" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style lang="scss" scoped>
@use './style';
</style>
