import type {
  BaseFormComponentType,
  ExtendedFormApi,
  VaticFormProps,
} from './types';

import { defineComponent, h, isReactive, onBeforeUnmount, watch } from 'vue';

import { useStore } from '@vatic-core/shared/store';

import { FormApi } from './form-api';
import VaticUseForm from './vatic-use-form.vue';

export function useVaticForm<
  T extends BaseFormComponentType = BaseFormComponentType,
>(options: VaticFormProps<T>) {
  const IS_REACTIVE = isReactive(options);
  const api = new FormApi(options);
  const extendedApi: ExtendedFormApi = api as never;
  extendedApi.useStore = (selector) => {
    return useStore(api.store, selector);
  };

  const Form = defineComponent(
    (props: VaticFormProps, { attrs, slots }) => {
      onBeforeUnmount(() => {
        api.unmount();
      });
      api.setState({ ...props, ...attrs });
      return () =>
        h(VaticUseForm, { ...props, ...attrs, formApi: extendedApi }, slots);
    },
    {
      name: 'VaticUseForm',
      inheritAttrs: false,
    },
  );
  // Add reactivity support
  if (IS_REACTIVE) {
    watch(
      () => options.schema,
      () => {
        api.setState({ schema: options.schema });
      },
      { immediate: true },
    );
  }

  return [Form, extendedApi] as const;
}
