<script lang="ts" setup>
import { computed } from 'vue';

import { AuthPageLayout } from '@vatic/layouts';
import { preferences } from '@vatic/preferences';

// const appName = computed(() => preferences.app.name);
const logo = computed(() => preferences.logo.source);
const clickLogo = () => {};
</script>

<template>
  <AuthPageLayout
    app-name=""
    :logo="logo"
    page-title=""
    :click-logo="clickLogo"
    :copyright="false"
  >
    <!-- 自定义工具栏 -->
    <!-- <template #toolbar></template> -->
  </AuthPageLayout>
</template>
