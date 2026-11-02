<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import { message } from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVaticForm } from '#/adapter/form';
import { getCarListApi } from '#/views/data';
import { getTrackList } from '#/views/track/data';

const mapContainer = ref(null);

const [QueryForm] = useVaticForm({
  collapsed: false,
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
  },
  handleSubmit: (values: Record<string, any>) => {
    renderTrack(values);
  },
  layout: 'horizontal',
  schema: [
    {
      component: 'ApiSelect',
      fieldName: 'busNo',
      hideLabel: true,
      componentProps: {
        api: getCarListApi,
        class: 'w-full',
        labelField: 'plateNo',
        showSearch: true,
        valueField: 'plateNo',
        autoSelect: 'first',
        placeholder: '请选择车牌号',
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'recordTime',
      hideLabel: true,
      defaultValue: dayjs().format('YYYY-MM-DD'),
      componentProps: {
        allowClear: false,
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
      },
    },
  ],
  showCollapseButton: false,
  resetButtonOptions: {
    show: false,
  },
  submitButtonOptions: {
    content: '查询',
  },
  actionWrapperClass: 'text-left col-span-1',
  wrapperClass: 'grid-cols-3 z-50',
});

let map: any;

function loadGuiyang() {
  const boundary = new BMapGL.Boundary();
  boundary.get('贵阳市', (rs: any) => {
    if (rs.boundaries.length === 0) {
      setTimeout(() => loadGuiyang(), 500);
    } else {
      const allPts: any[] = [];
      for (let i = 0; i < rs.boundaries.length; i++) {
        const xyArr = rs.boundaries[i].split(';');
        const ptArr = [];

        for (const element of xyArr) {
          const tmp = element.split(',');
          const pt = new BMapGL.Point(tmp[0], tmp[1]);
          ptArr.push(pt);
          allPts.push(pt);
        }
        // 闭合边界环（首尾点不同时补首点），保证轮廓线首尾相接
        const first = ptArr[0];
        const last = ptArr[ptArr.length - 1];
        if (
          ptArr.length > 1 &&
          (first.lng !== last.lng || first.lat !== last.lat)
        ) {
          ptArr.push(first);
        }

        // 边界描边：橙色轮廓线，浅色底图上清晰且与蓝色轨迹线区分
        const borderLine = new BMapGL.Polyline(ptArr, {
          strokeColor: '#fa8c16',
          strokeOpacity: 0.9,
          strokeWeight: 2,
        });
        map.addOverlay(borderLine);

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
      }

      // 初始视野固定在花溪区中心（centerAndZoom），不整体适配到贵阳市；
      // 拖动限制放宽到贵阳市边界外包矩形，可在市域范围内拖动查看
      if (allPts.length > 0) {
        // 拖动限制：以贵阳市边界外包矩形为限，拖动/缩放不能超出市域
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
  // 缩放限制：默认 12 级，可放大到 18 级查看细节，不可缩小到 11 级以下
  map.setMinZoom(11);
  map.setMaxZoom(18);
  map.centerAndZoom(
    new BMapGL.Point(106.623_548_548_890_23, 26.396_209_157_438_058),
    12,
  );

  document.querySelectorAll('.anchorBL').forEach((el) => el.remove());

  loadGuiyang();
}

async function renderTrack(values: any) {
  const data = await getTrackList(values);
  if (data && data.length > 0) {
    const polyline = new BMapGL.Polyline(
      data.map((p: any) => new BMapGL.Point(p[0], p[1])),
      { strokeColor: '#3388ff', strokeWeight: 3 },
    );

    const trackAni = new BMapGLLib.TrackAnimation(map, polyline, {
      icon: new BMapGL.Icon(
        '/assets/image/marker/car.png',
        new BMapGL.Size(32, 32),
      ),
      speed: 1000,
      autoView: true,
    });

    trackAni.start();
  } else {
    message.error('没有查询到轨迹数据！');
  }
}

onMounted(() => {
  loadMap();
});
</script>
<template>
  <div class="h-full w-full" style="min-width: 1700px">
    <div ref="mapContainer" class="h-full w-full"></div>
    <div class="absolute top-2 z-50 flex h-12 w-full justify-center">
      <QueryForm />
    </div>
  </div>
</template>
<style lang="scss" scoped>
::v-deep .vxe-table--body-wrapper {
  z-index: 999;
}

::v-deep .vxe-grid {
  padding: 0;

  .vxe-table--header-wrapper {
    background-color: transparent;
  }

  .vxe-toolbar {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 10;
    height: 38px;
  }
}

.popover-image {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  width: 500px;
  max-height: calc(100vh - 250px);
  margin-top: 10px;
  overflow: auto;
}
</style>
