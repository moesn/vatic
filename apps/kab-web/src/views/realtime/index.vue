<script lang="ts" setup>
import type { VxeTableGridOptions } from '@vatic/plugins/vxe-table';

import { onMounted, reactive, ref, watch } from 'vue';

import { ColPage } from '@vatic/common-ui';
import { IconifyIcon } from '@vatic/icons';

import { Button, Card, Tooltip } from 'ant-design-vue';

import { useVaticVxeGrid } from '#/adapter/vxe-table';
import { getDeptList } from '#/api';

const props = reactive({
  leftCollapsedWidth: 3,
  leftCollapsible: true,
  leftMaxWidth: 50,
  leftMinWidth: 10,
  leftWidth: 20,
  resizable: true,
  rightWidth: 80,
  splitHandle: true,
  splitLine: true,
});

const mapContainer = ref(null);
const showCar = ref<boolean>(true);
const showDevice = ref<boolean>(true);

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

let map: any;

window.addEventListener('resize', () => {
  loadStatsChart();
});

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

  document.querySelectorAll('.anchorBL').forEach((el) => el.remove());

  setTimeout(() => loadHuaXi(), 100);
}

let statsChart;

function loadStatsChart() {
  statsChart?.dispose();
  statsChart = echarts.init(document.querySelector('#stats-chart'));

  const option = {
    title: {
      text: '待派发风险事件排行',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    grid: {
      top: 40,
      bottom: 0,
      left: 10,
      right: 20,
    },
    xAxis: {
      type: 'value',
      show: false,
    },
    yAxis: {
      type: 'category',
      show: false,
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      data: [
        '坑洼',
        '龟裂',
        '沉陷',
        '护栏缺失',
        'A',
        'B',
        'C',
        'D',
        '龟裂',
        '沉陷',
        '护栏缺失',
        'A',
        'B',
        'C',
        'D',
      ],
    },
    series: [
      {
        name: 'stats',
        type: 'bar',
        barCategoryGap: 20,
        barMinWidth: 20,
        barMaxWidth: 30,
        label: {
          show: true,
          color: '#000',
          position: 'insideRight',
          formatter: '{b}   {c}',
        },
        itemStyle: {
          color(params) {
            return `rgb(230, 162, 60,${params.value / (Math.log(1000) * 1.25) + 0.2})`;
          },
        },
        data: [
          13, 489, 340, 970, 744, 230, 744, 230, 489, 340, 970, 744, 230, 744,
          230,
        ]
          .map((d) => Math.log(d))
          .sort(),
      },
    ],
  };

  statsChart.setOption(option);
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

const [Grid] = useVaticVxeGrid({
  gridEvents: {},
  gridOptions: {
    columns: [
      {
        align: 'left',
        field: 'name',
        fixed: 'left',
        title: '名称',
        treeNode: true,
        width: 150,
      },
    ],
    height: 'auto',
    keepSource: true,
    pagerConfig: {
      enabled: false,
    },
    proxyConfig: {
      ajax: {
        query: async (_params) => {
          return await getDeptList();
        },
      },
    },
    treeConfig: {
      parentField: 'pid',
      rowField: 'id',
      transform: false,
    },
  } as VxeTableGridOptions,
});

onMounted(() => {
  loadMap();
  setTimeout(() => loadStatsChart(), 100);
});
</script>
<template>
  <div class="h-full w-full" style="min-width: 1700px">
    <div ref="mapContainer" class="h-full w-full"></div>
    <div class="absolute top-0 flex h-full w-full justify-between">
      <ColPage auto-content-height v-bind="props">
        <template #left="{ isCollapsed, expand }">
          <div v-if="isCollapsed" @click="expand">
            <Tooltip title="点击展开左侧">
              <Button shape="circle" type="primary" class="z-50">
                <template #icon>
                  <IconifyIcon class="text-2xl" icon="bi:arrow-right" />
                </template>
              </Button>
            </Tooltip>
          </div>
          <div v-else :style="{ minWidth: '200px' }" class="z-50 h-full">
            <Grid class="z-50 h-full" />
          </div>
        </template>
        <div class="ml-2 h-full">
          <Card
            class="float-right h-full w-1/5"
            :body-style="{ height: '100%' }"
          >
            <div class="h-1/5 w-full"></div>
            <div class="h-4/5 w-full" id="stats-chart"></div>
          </Card>
        </div>
      </ColPage>
    </div>
  </div>
</template>
<style lang="scss" scoped>
::v-deep .vxe-table--body-wrapper {
  z-index: 999;
}
</style>
