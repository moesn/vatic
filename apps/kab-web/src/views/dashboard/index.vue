<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import styleJson from './style.json';

const mapContainer = ref(null);

onMounted(() => {
  const map = new BMapGL.Map(mapContainer.value, {
    enableMapClick: false,
  });

  map.centerAndZoom('花溪区', 14);
  map.enableScrollWheelZoom();
  map.setMapStyleV2({ styleJson });
});
</script>
<template>
  <div class="h-full w-full">
    <div ref="mapContainer" class="h-full w-full"></div>
    <div class="absolute top-0 flex h-full w-full justify-between">
      <div class="top-banner"></div>
      <div class="left"></div>
      <div class="right">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.top-banner {
  position: absolute;
  width: 100%;
  height: 50%;
  background-image: url('/assets/image/top-banner.png');
  background-repeat: no-repeat;
  background-size: contain;
}

.left,
.right {
  width: 300px;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
}
</style>
