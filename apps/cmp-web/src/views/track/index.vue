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

function loadHuaXi() {
  const boundary = new BMapGL.Boundary();
  boundary.get('花溪区', (rs: any) => {
    if (rs.boundaries.length === 0) {
      setTimeout(() => loadHuaXi(), 500);
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

  loadHuaXi();
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
