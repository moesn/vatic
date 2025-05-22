<script lang="ts" setup>
import { watch } from 'vue';

import { Maximize, Minimize } from '@vatic-core/icons';
import { updatePreferences, usePreferences } from '@vatic-core/preferences';

import { useFullscreen } from '@vueuse/core';

import { VaticIconButton } from '../button';

defineOptions({ name: 'FullScreen' });

const { isFullscreen, toggle } = useFullscreen();

// 重新检查全屏状态
isFullscreen.value = !!(
  document.fullscreenElement ||
  // @ts-ignore
  document.webkitFullscreenElement ||
  // @ts-ignore
  document.mozFullScreenElement ||
  // @ts-ignore
  document.msFullscreenElement
);

watch(isFullscreen, (isFull) => {
  const { contentIsMaximize } = usePreferences();
  const isMaximize = contentIsMaximize.value;

  updatePreferences({
    header: {
      hidden: !isMaximize || isFull,
    },
    sidebar: {
      hidden: !isMaximize || isFull,
    },
    tabbar: {
      enable: !isFull,
    },
  });
});
</script>
<template>
  <VaticIconButton @click="toggle">
    <Minimize v-if="isFullscreen" class="text-foreground size-4" />
    <Maximize v-else class="text-foreground size-4" />
  </VaticIconButton>
</template>
