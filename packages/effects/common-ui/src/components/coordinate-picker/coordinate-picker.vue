<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

import { LocationEdit } from '@vatic/icons';

import { Input, VaticIcon } from '@vatic-core/shadcn-ui';

import { Button } from 'ant-design-vue';

const modelValue = defineModel({ default: [], type: Object });

const visible = ref(false);
const mapContainer = ref(null);
const mapIsLoaded = ref(false);

const handleClick = (value: Array<Number>) => {
  modelValue.value = value;
};

function toggleOpenState() {
  visible.value = !visible.value;
}

function close() {
  visible.value = false;
}

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
        map.addEventListener('click', (e: any) => {
          handleClick([e.latlng.lng, e.latlng.lat]);
        });
      }
      mapIsLoaded.value = true;
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
  document.querySelectorAll('.anchorBL').forEach((el) => el.remove());

  setTimeout(() => loadHuaXi(), 100);
}

watch(
  () => modelValue.value,
  (val) => {
    if (val) {
      map.getOverlays().forEach((overlay: any) => {
        map.removeOverlay(overlay);
      });
      map.addOverlay(new BMapGL.Marker(new BMapGL.Point(val[0], val[1])));
    }
  },
);

onMounted(() => {
  loadMap();
});
</script>
<template>
  <div class="relative w-full">
    <Input
      v-model="modelValue"
      class="h-8 w-full pr-8"
      placeholder="请选择经纬度"
      disabled
    />
    <VaticIcon
      :icon="LocationEdit"
      class="absolute right-1 top-1 size-6 cursor-pointer"
      aria-hidden="true"
      @click="toggleOpenState"
    />
    <div v-show="visible" class="map-dialog">
      <Button @click="close" class="absolute right-1 top-1 z-20 cursor-pointer">
        关闭
      </Button>
      <div ref="mapContainer" class="h-full w-full"></div>
    </div>
  </div>
</template>
<style scoped>
.map-dialog {
  position: fixed;
  top: 50%;
  right: 520px;
  z-index: 10;
  width: calc(100vw - 520px);
  height: 70vh;
  background: white;
  transform: translate(0, -50%);
}
</style>
