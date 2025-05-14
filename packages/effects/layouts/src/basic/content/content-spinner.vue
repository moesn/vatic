<script lang="ts" setup>
import { VaticSpinner } from '@vatic-core/shadcn-ui';

import { useContentSpinner } from './use-content-spinner';

defineOptions({ name: 'LayoutContentSpinner' });

const { spinning } = useContentSpinner();
</script>
<template>
  <VaticSpinner :spinning="spinning" />
</template>
