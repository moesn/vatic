<script lang="ts" setup>
import { Fallback, VaticButton } from '@vatic/common-ui';
import { useTabs } from '@vatic/hooks';
import { X } from '@vatic/icons';

const { closeCurrentTab } = useTabs();
</script>

<template>
  <Fallback
    description="当前路由在菜单中不可见"
    status="coming-soon"
    title="被隐藏的子菜单"
    show-back
  >
    <template #action>
      <VaticButton size="lg" @click="closeCurrentTab()">
        <X class="mr-2 size-4" />
        关闭当前标签页
      </VaticButton>
    </template>
  </Fallback>
</template>
