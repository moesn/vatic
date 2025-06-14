<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';

import { Switch } from 'ant-design-vue';

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
const riskTotal = ref<number>(999);
const riskPageSize = ref<number>(5);
const riskPageNum = ref<number>(1);

type MarkerType = 'car' | 'device';

const markers: any = {
  car: [
    {
      jin: 106.623_548_548_890_23,
      wei: 26.396_209_157_438_058,
    },
  ],
  device: [
    {
      jin: 106.523_548_548_890_23,
      wei: 26.396_209_157_438_058,
    },
  ],
};

const videos: any = [
  {
    url: '1.flv',
  },
  {
    url: '2.flv',
  },
  {
    url: '3.flv',
  },
  {
    url: '4.flv',
  },
  {
    url: '4.flv',
  },
];

function calcVideoWidth() {
  videoWidth.value =
    (document.querySelector('.right')?.offsetHeight * 168) /
      (94 * videos.length) -
    30;

  riskPageNum.value = 1;
  riskPageSize.value = Math.floor(
    document.querySelector('.risk')?.offsetHeight / 100,
  );
}

window.addEventListener('resize', () => {
  calcVideoWidth();
  loadTaskChart();
});

function loadVideo() {
  if (flvjs.isSupported()) {
    const videoElements = document.querySelectorAll('.videoElement');
    videoElements?.forEach((videoElement: any, index: number) => {
      const { url } = videos[index];
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

let taskChart;

function loadTaskChart() {
  taskChart?.dispose();
  taskChart = echarts.init(document.querySelector('#task-chart'));
  const chartWidth = document.querySelector('.bottom-left')?.offsetWidth / 3;
  const chartHeight = 200;
  const radius = Math.min(chartWidth, chartHeight) / 2;

  const option = {
    responsive: true,
    tooltip: {
      trigger: 'item',
    },
    legend: {
      orient: 'vertical',
      top: 10,
      left: 30,
      itemGap: 22,
      textStyle: {
        color: '#FFFFFF',
      },
    },
    series: [
      {
        title: '123',
        name: 'task-high',
        type: 'pie',
        radius,
        center: [chartWidth * 2 - 160, 120],
        data: [
          { value: 1048, name: '未派发（紧急）' },
          { value: 735, name: '进行中' },
          { value: 580, name: '已完成' },
        ],
        label: {
          color: '#FFFFFF',
          fontWeight: 600,
          position: 'inside',
        },
        labelLine: {
          show: false,
        },
        itemStyle: {
          color(params: any) {
            const colors = {
              pending: {
                type: 'linear',
                x: 0.5,
                y: 0.5,
                x2: 0,
                y2: 0,
                colorStops: [
                  { offset: 0.5, color: '#FF3B30' },
                  { offset: 1, color: 'rgba(0, 0, 0, 0)' },
                ],
              },
              process: {
                type: 'linear',
                x: 0.5,
                y: 0.5,
                x2: 0,
                y2: 0,
                colorStops: [
                  { offset: 0.5, color: '#007AFF' },
                  { offset: 1, color: 'rgba(0, 0, 0, 0)' },
                ],
              },
              complete: {
                type: 'linear',
                x: 0.5,
                y: 0.5,
                x2: 0,
                y2: 0,
                colorStops: [
                  { offset: 0.5, color: '#34C759' },
                  { offset: 1, color: 'rgba(0, 0, 0, 0)' },
                ],
              },
            };

            return Object.values(colors)[params.dataIndex];
          },
        },
      },
      {
        name: 'task-low',
        type: 'pie',
        radius,
        center: [chartWidth * 3 - 140, 120],
        data: [
          { value: 1048, name: '未派发 ' },
          { value: 735, name: '进行中 ' },
          { value: 580, name: '已完成 ' },
        ],
        label: {
          color: '#FFFFFF',
          fontWeight: 600,
          position: 'inside',
        },
        labelLine: {
          show: false,
        },
        itemStyle: {
          color(params: any) {
            const colors = {
              pending: {
                type: 'linear',
                x: 0.5,
                y: 0.5,
                x2: 0,
                y2: 0,
                colorStops: [
                  { offset: 0.5, color: '#FF9500' },
                  { offset: 1, color: 'rgba(0, 0, 0, 0)' },
                ],
              },
              process: {
                type: 'linear',
                x: 0.5,
                y: 0.5,
                x2: 0,
                y2: 0,
                colorStops: [
                  { offset: 0.5, color: '#007AFF' },
                  { offset: 1, color: 'rgba(0, 0, 0, 0)' },
                ],
              },
              complete: {
                type: 'linear',
                x: 0.5,
                y: 0.5,
                x2: 0,
                y2: 0,
                colorStops: [
                  { offset: 0.5, color: '#34C759' },
                  { offset: 1, color: 'rgba(0, 0, 0, 0)' },
                ],
              },
            };

            return Object.values(colors)[params.dataIndex];
          },
        },
      },
    ],
  };

  taskChart.setOption(option, true);
}

watch(showCar, (val) => {
  renderMarkers(val, 'car');
});

watch(showDevice, (val) => {
  renderMarkers(val, 'device');
});

onMounted(() => {
  loadMap();
  calcVideoWidth();
  loadVideo();
  setTimeout(() => loadTaskChart());
  setTimeout(() => (document.querySelector('table').innerHTML = ''), 5000);
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
          <h2>今日统计概览</h2>
          <div class="lt-stats-dash">
            <h3>路产数量</h3>
            <h3>风险事件</h3>
            <h4>0092</h4>
            <h4>0265</h4>
          </div>
          <div class="lt-dash">
            <div>
              <h3>人员(12)</h3>
              <h3>桥梁(12)</h3>
              <h3>边坡(12)</h3>
            </div>
            <div>
              <h3>养护车辆</h3>
              <h3>12/341</h3>
              <Switch v-model:checked="showCar" />
            </div>
            <div>
              <h3>视频监控</h3>
              <h3>12/34</h3>
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
              @click="riskPageNum > 1 ? (riskPageNum -= 1) : ''"
            />
            <h3>
              {{ (riskPageNum - 1) * riskPageSize }} ~
              {{ Math.min(riskPageNum * riskPageSize, riskTotal) }} /
              {{ riskTotal }}
            </h3>
            <img
              src="/assets/image/risk/next.png"
              @click="
                riskPageNum < riskTotal / riskPageSize ? (riskPageNum += 1) : ''
              "
            />
          </div>
          <div class="nav">
            <h3 class="active">未派发(236)</h3>
            <h3>处理中(326)</h3>
            <h3>待复核(623)</h3>
          </div>
          <div class="risk">
            <div>
              <img src="/test.png" alt="" />
              <div>
                <h4>这是风险名称</h4>
                <h5>这里是风险详细地址</h5>
                <h5>2025-06-01 12:00:00</h5>
              </div>
            </div>
            <div>
              <img src="/test.png" alt="" />
              <div>
                <h4>这是风险名称</h4>
                <h5>这里是风险详细地址</h5>
                <h5>2025-06-01 12:00:00</h5>
              </div>
            </div>
            <div>
              <img src="/test.png" alt="" />
              <div>
                <h4>这是风险名称</h4>
                <h5>这里是风险详细地址</h5>
                <h5>2025-06-01 12:00:00</h5>
              </div>
            </div>
            <div>
              <img src="/test.png" alt="" />
              <div>
                <h4>这是风险名称</h4>
                <h5>这里是风险详细地址</h5>
                <h5>2025-06-01 12:00:00</h5>
              </div>
            </div>
            <div>
              <img src="/test.png" alt="" />
              <div>
                <h4>这是风险名称</h4>
                <h5>这里是风险详细地址</h5>
                <h5>2025-06-01 12:00:00</h5>
              </div>
            </div>
            <div>
              <img src="/test.png" alt="" />
              <div>
                <h4>这是风险名称</h4>
                <h5>这里是风险详细地址</h5>
                <h5>2025-06-01 12:00:00</h5>
              </div>
            </div>
            <div>
              <img src="/test.png" alt="" />
              <div>
                <h4>这是风险名称</h4>
                <h5>这里是风险详细地址</h5>
                <h5>2025-06-01 12:00:00</h5>
              </div>
            </div>
            <div>
              <img src="/test.png" alt="" />
              <div>
                <h4>这是风险名称</h4>
                <h5>这里是风险详细地址</h5>
                <h5>2025-06-01 12:00:00</h5>
              </div>
            </div>
            <div>
              <img src="/test.png" alt="" />
              <div>
                <h4>这是风险名称</h4>
                <h5>这里是风险详细地址</h5>
                <h5>2025-06-01 12:00:00</h5>
              </div>
            </div>
            <div>
              <img src="/test.png" alt="" />
              <div>
                <h4>这是风险名称</h4>
                <h5>这里是风险详细地址</h5>
                <h5>2025-06-01 12:00:00</h5>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="right" :style="{ width: `${videoWidth}px` }">
        <template v-for="_ in [1, 2, 3, 4, 5]" :key="_">
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
            <div>
              <div>
                <h3>花溪花溪路</h3>
                <span></span>
              </div>
              <div>
                <img src="/assets/image/weather/temperature.png" alt="" />
                <h3>23℃</h3>
                <h3>温</h3>
              </div>
              <div>
                <img src="/assets/image/weather/wet.png" alt="" />
                <h3>65%RH</h3>
                <h3>湿</h3>
              </div>
              <div>
                <img src="/assets/image/weather/speed.png" alt="" />
                <h3>3m/s</h3>
                <h3>风</h3>
              </div>
              <div>
                <img src="/assets/image/weather/direction.png" alt="" />
                <h3>东风90°</h3>
                <h3>风</h3>
              </div>
              <div>
                <img src="/assets/image/weather/pressure.png" alt="" />
                <h3>30Pa</h3>
                <h3>气</h3>
              </div>
            </div>
            <div>
              <div>
                <span></span>
                <h3>花溪路花溪</h3>
              </div>
              <div>
                <h3>度</h3>
                <h3>23℃</h3>
                <img src="/assets/image/weather/temperature.png" alt="" />
              </div>
              <div>
                <h3>度</h3>
                <h3>65%RH</h3>
                <img src="/assets/image/weather/wet.png" alt="" />
              </div>
              <div>
                <h3>速</h3>
                <h3>3m/s</h3>
                <img src="/assets/image/weather/speed.png" alt="" />
              </div>
              <div>
                <h3>向</h3>
                <h3>东风90°</h3>
                <img src="/assets/image/weather/direction.png" alt="" />
              </div>
              <div>
                <h3>压</h3>
                <h3>30Pa</h3>
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
