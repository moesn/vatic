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

<style scoped lang="scss">
:deep .bg-background-deep {
  .login-background {
    background-image: url('/slogin.png');
    background-repeat: no-repeat;
    background-size: 100% 100%;
    filter: none;
  }

  .flex-col-center {
    display: none;
  }
}

:deep .bg-background {
  background: linear-gradient(
    154deg,
    rgb(7 7 9 / 8.24%) 30%,
    hsl(var(--primary) / 30%) 48%,
    rgb(7 7 9 / 8.24%) 64%
  );
}
</style>
