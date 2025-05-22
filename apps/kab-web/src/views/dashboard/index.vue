<script lang="ts" setup>
import { onMounted } from 'vue';

onMounted(() => {
  const map = new BMapGL.Map('map-container');
  const point = new BMapGL.Point(116.404, 39.915);
  map.centerAndZoom(point, 10);
  map.enableScrollWheelZoom();
});
</script>
<template>
  <div id="map-container" style="width: 100%; height: 100%"></div>
</template>
