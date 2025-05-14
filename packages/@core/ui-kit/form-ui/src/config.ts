import type { Component } from 'vue';

import type {
  BaseFormComponentType,
  FormCommonConfig,
  VaticFormAdapterOptions,
} from './types';

import { h } from 'vue';

import {
  VaticButton,
  VaticCheckbox,
  Input as VaticInput,
  VaticInputPassword,
  VaticPinInput,
  VaticSelect,
} from '@vatic-core/shadcn-ui';
import { globalShareState } from '@vatic-core/shared/global-state';

import { defineRule } from 'vee-validate';

const DEFAULT_MODEL_PROP_NAME = 'modelValue';

export const DEFAULT_FORM_COMMON_CONFIG: FormCommonConfig = {};

export const COMPONENT_MAP: Record<BaseFormComponentType, Component> = {
  DefaultButton: h(VaticButton, { size: 'sm', variant: 'outline' }),
  PrimaryButton: h(VaticButton, { size: 'sm', variant: 'default' }),
  VaticCheckbox,
  VaticInput,
  VaticInputPassword,
  VaticPinInput,
  VaticSelect,
};

export const COMPONENT_BIND_EVENT_MAP: Partial<
  Record<BaseFormComponentType, string>
> = {
  VaticCheckbox: 'checked',
};

export function setupVaticForm<
  T extends BaseFormComponentType = BaseFormComponentType,
>(options: VaticFormAdapterOptions<T>) {
  const { config, defineRules } = options;

  const {
    disabledOnChangeListener = true,
    disabledOnInputListener = true,
    emptyStateValue = undefined,
  } = (config || {}) as FormCommonConfig;

  Object.assign(DEFAULT_FORM_COMMON_CONFIG, {
    disabledOnChangeListener,
    disabledOnInputListener,
    emptyStateValue,
  });

  if (defineRules) {
    for (const key of Object.keys(defineRules)) {
      defineRule(key, defineRules[key as never]);
    }
  }

  const baseModelPropName =
    config?.baseModelPropName ?? DEFAULT_MODEL_PROP_NAME;
  const modelPropNameMap = config?.modelPropNameMap as
    | Record<BaseFormComponentType, string>
    | undefined;

  const components = globalShareState.getComponents();

  for (const component of Object.keys(components)) {
    const key = component as BaseFormComponentType;
    COMPONENT_MAP[key] = components[component as never];

    if (baseModelPropName !== DEFAULT_MODEL_PROP_NAME) {
      COMPONENT_BIND_EVENT_MAP[key] = baseModelPropName;
    }

    // 覆盖特殊组件的modelPropName
    if (modelPropNameMap && modelPropNameMap[key]) {
      COMPONENT_BIND_EVENT_MAP[key] = modelPropNameMap[key];
    }
  }
}
