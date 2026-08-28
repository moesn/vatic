<script setup lang="ts">
import type { Recordable } from '@vatic/types';

import { reactive } from 'vue';

import { $t } from '@vatic/locales';

import { useVaticForm, z } from '@vatic-core/form-ui';
import { useVaticModal } from '@vatic-core/popup-ui';
import { VaticButton } from '@vatic-core/shadcn-ui';

defineOptions({
  name: 'ChangePasswordModal',
});

const emit = defineEmits<{
  submit: [{ newPassword: string; oldPassword: string }];
}>();

const [Form, { resetForm, validate, getValues }] = useVaticForm(
  reactive({
    commonConfig: {
      hideLabel: false,
      hideRequiredMark: false,
    },
    schema: [
      {
        component: 'VaticInputPassword' as const,
        componentProps: {
          placeholder: '请输入旧密码',
        },
        fieldName: 'oldPassword',
        label: '旧密码',
        rules: z.string().min(1, { message: '请输入旧密码' }),
      },
      {
        component: 'VaticInputPassword' as const,
        componentProps: {
          placeholder: '请输入新密码',
        },
        fieldName: 'newPassword',
        label: '新密码',
        rules: z.string().min(6, { message: '新密码至少 6 位' }),
      },
      {
        component: 'VaticInputPassword' as const,
        componentProps: {
          placeholder: '请再次输入新密码',
        },
        fieldName: 'confirmPassword',
        label: '确认新密码',
        rules: z.string().min(6, { message: '请再次输入新密码' }),
      },
    ],
    showDefaultActions: false,
  }),
);

const [Modal, modalApi] = useVaticModal({
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      resetForm();
    }
  },
});

async function handleSubmit() {
  const { valid } = await validate();
  if (!valid) {
    return;
  }
  const values = (await getValues()) as Recordable<any>;
  if (values.newPassword !== values.confirmPassword) {
    emit('submit', {
      newPassword: '',
      oldPassword: '',
    });
    return;
  }
  emit('submit', {
    newPassword: values.newPassword,
    oldPassword: values.oldPassword,
  });
}

function close() {
  modalApi.close();
}

defineExpose({ close });
</script>

<template>
  <Modal
    :confirm-text="$t('common.confirm')"
    :title="'修改密码'"
    class="!top-[88px]"
  >
    <div
      class="flex min-h-[260px] flex-col px-8 py-10"
      @keydown.enter.prevent="handleSubmit"
    >
      <Form />
      <VaticButton class="mt-8 w-full" @click="handleSubmit">
        确认修改
      </VaticButton>
    </div>
  </Modal>
</template>
