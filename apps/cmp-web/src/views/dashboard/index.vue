<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';

import { message } from 'ant-design-vue';

import {
  getDataStatsApi,
  getDeviceListApi,
  getEventStatsApi,
  getTaskStatsApi,
  getWeatherListApi,
} from '#/views/dashboard/data';

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

// region 统计概览
const statsData = ref<any>({});

function getStatsData() {
  getDataStatsApi().then((res: any) => {
    statsData.value = res;
  });
}

// endregion

// region 风险
const riskPageSize = ref<number>(0);
const riskPageNo = ref<number>(1);
const eventActive = ref('未派发');
const eventStates: string[] = ['未派发', '待确认', '处理中', '待复核'];
const eventStats = ref<any>([]);

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

getDeviceList();
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
const deviceTypes = [
  {
    name: '桥梁监控',
    online: 'onlineDeviceCount',
    all: 'deviceCount',
    show: true,
  },
  {
    name: '路面监控',
    online: 'onlineDeviceCount',
    all: 'deviceCount',
    show: true,
  },
  {
    name: '边坡监控',
    online: 'onlineDeviceCount',
    all: 'deviceCount',
    show: true,
  },
];

let map: any;

function loadHuaXi() {
  const boundary = new BMapGL.Boundary();
  boundary.get('四川', (rs: any) => {
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

        deviceTypes.forEach((item: any) => createMarkersByType(item.name));
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
    new BMapGL.Point(104.072_358_099_155, 30.664_376_459_765_21),
    13,
  );
  map.setMapStyleV2({ styleJson });

  document.querySelectorAll('.anchorBL').forEach((el) => el.remove());

  setTimeout(() => loadHuaXi(), 100);
}

function createMarkersByType(type: string) {
  const bodyWidth = document.body.offsetWidth;
  const width = Math.min(bodyWidth * 0.03, 90);
  const height = Math.min(bodyWidth * 0.04, 120);

  allDeviceList.value
    ?.filter((d: any) => d.purpose === type)
    .forEach((item: any) => {
      const icon = new BMapGL.Icon(
        `/assets/image/marker/${type}${item.status || 0}.png`,
        new BMapGL.Size(width, height),
      );
      const pt = new BMapGL.Point(item.longitude, item.latitude);
      const marker = new BMapGL.Marker(pt, { icon, type });
      map.addOverlay(marker);
    });
}

// endregion

const charts: any = [];
const colors = (i: number, a: number) =>
  [`rgba(234,74,87,${a})`, `rgba(25,236,255,${a})`][i];
const taskTypes: string[] = ['计划', '实际'];
const taskStates: string[] = ['1季度', '2季度', '3季度', '4季度'];
const taskData = ref<any>({});

function renderChart(idx: number) {
  let chart = charts[idx];
  chart?.dispose();
  chart = echarts.init(document.querySelector(`#chart${idx}`));

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
  chart.setOption(option, true);
}

function loadTaskChart(init: boolean = false) {
  if (init) {
    getTaskStatsApi().then((res) => {
      res = [
        {
          taskType: '计划',
          status: '1季度',
          count: 12,
        },
        {
          taskType: '计划',
          status: '2季度',
          count: 6,
        },
        {
          taskType: '计划',
          status: '3季度',
          count: 20,
        },
        {
          taskType: '计划',
          status: '4季度',
          count: 2,
        },
        {
          taskType: '实际',
          status: '1季度',
          count: 17,
        },
        {
          taskType: '实际',
          status: '2季度',
          count: 8,
        },
        {
          taskType: '实际',
          status: '4季度',
          count: 5,
        },
        {
          taskType: '实际',
          status: '3季度',
          count: 12,
        },
      ];
      taskTypes.forEach((type) => {
        taskData.value[type] = taskStates.map((status) => {
          const stat = res.find(
            (d: any) => d.status === status && d.taskType === type,
          );
          return stat?.count || 0;
        });
      });
      renderChart(1);
      renderChart(2);
      renderChart(3);
      renderChart(4);
    });
  } else {
    renderChart();
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
      <div class="bottom">
        <div class="box-card">
          <div>
            <p>在建项目合同额(万元)</p>
            <h1>100000</h1>
          </div>
          <div>
            <p>在建项目开累量(万元)</p>
            <h1>100000</h1>
          </div>
          <div>
            <p>在建项目储备量(万元)</p>
            <h1>100000</h1>
          </div>
          <div>
            <p>年度计划(万元)</p>
            <h1>100000</h1>
          </div>
          <div>
            <p>年度实际(万元)</p>
            <h1>100000</h1>
          </div>
        </div>
        <div class="box-dash">
          <div
            id="chart1"
            class="chart"
            :style="{ width: 'calc(25% - 10px)' }"
          ></div>
          <div
            id="chart2"
            class="chart"
            :style="{ width: 'calc(25% - 10px)' }"
          ></div>
          <div
            id="chart3"
            class="chart"
            :style="{ width: 'calc(25% - 10px)' }"
          ></div>
          <div
            id="chart4"
            class="chart"
            :style="{ width: 'calc(25% - 10px)' }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>
<style lang="scss" scoped>
@use './style';
</style>
