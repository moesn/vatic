<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import { Switch } from 'ant-design-vue';

import box from './box.vue';
import styleJson from './style.json';

const mapContainer = ref(null);
const videoWidth = ref(0);
const showCar = ref<boolean>(true);
const showDevice = ref<boolean>(true);

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

function loadMap() {
  const map = new BMapGL.Map(mapContainer.value, {
    enableMapClick: false,
  });

  map.centerAndZoom(
    new BMapGL.Point(106.623_548_548_890_23, 26.396_209_157_438_058),
    13,
  );
  map.enableScrollWheelZoom();
  map.setMapStyleV2({ styleJson });

  const boundary = new BMapGL.Boundary();
  boundary.get('花溪区', (rs: any) => {
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
    }
  });
}

function loadTaskChart() {
  const taskChart = echarts.init(document.querySelector('#task-chart'));
  const centerX = document.querySelector('.bottom-left')?.offsetWidth / 2 + 20;

  const option = {
    responsive: true,
    tooltip: {
      trigger: 'item',
    },
    legend: {
      orient: 'vertical',
      top: 10,
      left: 30,
      itemGap: 20,
      textStyle: {
        color: '#FFFFFF',
      },
    },
    series: [
      {
        name: 'task',
        type: 'pie',
        radius: '75%',
        center: [centerX, 120],
        data: [
          { value: 1048, name: '待开始' },
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
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: '#FF9500' },
                  { offset: 1, color: '#ffe135' },
                ],
              },
              process: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 1,
                y2: 0,
                colorStops: [
                  { offset: 0, color: '#007AFF' },
                  { offset: 1, color: '#69c0ff' },
                ],
              },
              complete: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 1,
                y2: 1,
                colorStops: [
                  { offset: 0, color: '#34C759' },
                  { offset: 1, color: '#50c878' },
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
              <h3>桥梁13</h3>
              <h3>偏坡33</h3>
            </div>
            <div>
              <h3>养护人员</h3>
              <h3>12</h3>
              <h3></h3>
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
          <h2>最近风险</h2>
        </div>
      </div>
      <div class="right" :style="{ width: `${videoWidth}px` }">
        <template v-for="item in [1, 2, 3, 4, 5]" :key="item">
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
