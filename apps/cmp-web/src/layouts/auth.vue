<script lang="ts" setup>
import { computed } from 'vue';

import { AuthPageLayout } from '@vatic/layouts';
import { preferences } from '@vatic/preferences';

const appName = computed(() => preferences.app.name);
const logo = computed(() => preferences.logo.source);
const clickLogo = () => {};
</script>

<template>
  <AuthPageLayout
    :app-name="appName"
    :logo="logo"
    page-title="XXXX系统"
    :click-logo="clickLogo"
  >
    <!-- 自定义工具栏 -->
    <!-- <template #toolbar></template> -->
  </AuthPageLayout>
</template>
