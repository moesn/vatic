<script lang="ts" setup>
import type { Arrayable } from '@vueuse/core';

import type { ValueType, VaticButtonGroupProps } from './button';

import { computed, ref, watch } from 'vue';

import { Circle, CircleCheckBig, LoaderCircle } from '@vatic-core/icons';
import { cn, isFunction } from '@vatic-core/shared/utils';

import { objectOmit } from '@vueuse/core';

import { VaticRenderContent } from '../render-content';
import VaticButtonGroup from './button-group.vue';
import Button from './button.vue';

const props = withDefaults(defineProps<VaticButtonGroupProps>(), {
  gap: 0,
  multiple: false,
  showIcon: true,
  size: 'middle',
});
const emit = defineEmits(['btnClick']);
const btnDefaultProps = computed(() => {
  return {
    ...objectOmit(props, ['options', 'btnClass', 'size', 'disabled']),
    class: cn(props.btnClass),
  };
});
const modelValue = defineModel<Arrayable<ValueType> | undefined>();

const innerValue = ref<Array<ValueType>>([]);
const loadingValues = ref<Array<ValueType>>([]);
watch(
  () => props.multiple,
  (val) => {
    if (val) {
      modelValue.value = innerValue.value;
    } else {
      modelValue.value =
        innerValue.value.length > 0 ? innerValue.value[0] : undefined;
    }
  },
);

watch(
  () => modelValue.value,
  (val) => {
    if (Array.isArray(val)) {
      const arrVal = val.filter((v) => v !== undefined);
      if (arrVal.length > 0) {
        innerValue.value = props.multiple
          ? [...arrVal]
          : [arrVal[0] as ValueType];
      } else {
        innerValue.value = [];
      }
    } else {
      innerValue.value = val === undefined ? [] : [val as ValueType];
    }
  },
  { deep: true, immediate: true },
);

async function onBtnClick(value: ValueType) {
  if (props.beforeChange && isFunction(props.beforeChange)) {
    try {
      loadingValues.value.push(value);
      const canChange = await props.beforeChange(
        value,
        !innerValue.value.includes(value),
      );
      if (canChange === false) {
        return;
      }
    } finally {
      loadingValues.value.splice(loadingValues.value.indexOf(value), 1);
    }
  }

  if (props.multiple) {
    if (innerValue.value.includes(value)) {
      innerValue.value = innerValue.value.filter((item) => item !== value);
    } else {
      innerValue.value.push(value);
    }
    modelValue.value = innerValue.value;
  } else {
    innerValue.value = [value];
    modelValue.value = value;
  }
  emit('btnClick', value);
}
</script>
<template>
  <VaticButtonGroup
    :size="props.size"
    :gap="props.gap"
    class="vatic-check-button-group"
  >
    <Button
      v-for="(btn, index) in props.options"
      :key="index"
      :class="cn('border', props.btnClass)"
      :disabled="
        props.disabled ||
        loadingValues.includes(btn.value) ||
        (!props.multiple && loadingValues.length > 0)
      "
      v-bind="btnDefaultProps"
      :variant="innerValue.includes(btn.value) ? 'default' : 'outline'"
      @click="onBtnClick(btn.value)"
    >
      <div class="icon-wrapper" v-if="props.showIcon">
        <LoaderCircle
          class="animate-spin"
          v-if="loadingValues.includes(btn.value)"
        />
        <CircleCheckBig v-else-if="innerValue.includes(btn.value)" />
        <Circle v-else />
      </div>
      <slot name="option" :label="btn.label" :value="btn.value">
        <VaticRenderContent :content="btn.label" />
      </slot>
    </Button>
  </VaticButtonGroup>
</template>
<style lang="scss" scoped>
.vatic-check-button-group {
  &:deep(.size-large) button {
    .icon-wrapper {
      margin-right: 0.3rem;

      svg {
        width: 1rem;
        height: 1rem;
      }
    }
  }

  &:deep(.size-middle) button {
    .icon-wrapper {
      margin-right: 0.2rem;

      svg {
        width: 0.75rem;
        height: 0.75rem;
      }
    }
  }

  &:deep(.size-small) button {
    .icon-wrapper {
      margin-right: 0.1rem;

      svg {
        width: 0.65rem;
        height: 0.65rem;
      }
    }
  }
}
</style>
