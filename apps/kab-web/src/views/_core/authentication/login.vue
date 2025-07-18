<script lang="ts" setup>
import type { VaticFormSchema } from '@vatic/common-ui';
import type { Recordable } from '@vatic/types';

import { computed, markRaw, useTemplateRef } from 'vue';

import { AuthenticationLogin, SliderCaptcha, z } from '@vatic/common-ui';
import { $t } from '@vatic/locales';

import { useAuthStore } from '#/store';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();

const formSchema = computed((): VaticFormSchema[] => {
  return [
    {
      component: 'VaticInput',
      componentProps: {
        placeholder: $t('authentication.usernameTip'),
      },
      fieldName: 'account',
      label: $t('authentication.username'),
      rules: z.string().min(1, { message: $t('authentication.usernameTip') }),
    },
    {
      component: 'VaticInputPassword',
      componentProps: {
        placeholder: $t('authentication.password'),
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      rules: z.string().min(1, { message: $t('authentication.passwordTip') }),
    },
    {
      component: markRaw(SliderCaptcha),
      fieldName: 'captcha',
      rules: z.boolean().refine((value) => value, {
        message: $t('authentication.verifyRequiredTip'),
      }),
    },
  ];
});

const loginRef =
  useTemplateRef<InstanceType<typeof AuthenticationLogin>>('loginRef');

async function onSubmit(params: Recordable<any>) {
  authStore.authLogin(params).catch(() => {
    // 登陆失败，刷新验证码的演示

    // 使用表单API获取验证码组件实例，并调用其resume方法来重置验证码
    loginRef.value
      ?.getFormApi()
      ?.getFieldComponentRef<InstanceType<typeof SliderCaptcha>>('captcha')
      ?.resume();
  });
}
</script>

<template>
  <AuthenticationLogin
    ref="loginRef"
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    @submit="onSubmit"
  />
</template>
