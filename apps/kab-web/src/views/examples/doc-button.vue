<script lang="ts" setup>
import { VATIC_DOC_URL } from '@vatic/constants';
import { openWindow } from '@vatic/utils';

import { Button } from 'ant-design-vue';

const props = defineProps<{ path: string }>();

function handleClick() {
  // 如果没有.html，打开页面时可能会出现404
  const path =
    VATIC_DOC_URL +
    (props.path.toLowerCase().endsWith('.html')
      ? props.path
      : `${props.path}.html`);
  openWindow(path);
}
</script>

<template>
  <Button @click="handleClick">查看组件文档</Button>
</template>
