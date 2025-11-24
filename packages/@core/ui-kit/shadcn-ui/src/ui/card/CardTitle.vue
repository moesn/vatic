<script setup lang="ts">
import { cn } from '@vatic-core/shared/utils';

const props = defineProps<{
  class?: any;
}>();
</script>

<template>
  <h5 :class="cn('font-semibold leading-none tracking-tight', props.class)">
    <slot></slot>
  </h5>
</template>
