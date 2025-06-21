<script lang="ts" setup>
import { ref } from 'vue';

import { useVaticDrawer } from '@vatic/common-ui';

import { message } from 'ant-design-vue';

import { useVaticForm } from '#/adapter/form';
import { requestClient } from '#/api/request';

import { parseApi } from '../helper';
import * as transforms from '../transforms';

const emits = defineEmits(['success']);

const transformsAny: any = transforms;

const drawerInit = ref(false);
const drawerTitle = ref('');

const formData = ref();

let Form: any, formApi: any;

const [Drawer, drawerApi] = useVaticDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const body = await formApi.getValues();

    message.loading({
      content: '保存中...',
      duration: 0,
      key: 'is-form-submitting',
    });
    drawerApi.lock();

    const { create, update, keyField, transformBody, pageName } =
      drawerApi.getSchema();
    const rawData = drawerApi.getData();

    const keyValue = rawData[keyField];
    body[keyField] = keyValue;

    if (transformBody) {
      transformsAny[pageName]?.transformBody(body);
    }

    (keyValue
      ? requestClient.patch(update, body)
      : requestClient.post(create, body)
    )
      .then(() => {
        emits('success');
        drawerApi.close();
        message.success({
          content: `保存成功`,
          duration: 2,
          key: 'is-form-submitting',
        });
      })
      .catch(() => {
        drawerApi.unlock();
      });
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      const {
        items: schema,
        title,
        keyField,
        detail,
        transformData,
        pageName,
      } = drawerApi.getSchema();
      const titles = title.split('&');

      [Form, formApi] = useVaticForm({
        schema,
        showDefaultActions: false,
      });

      const data = drawerApi.getData();
      formApi.resetForm();

      if (data[keyField]) {
        drawerTitle.value = titles[1] || titles[0];
        if (detail) {
          const apiUrl = parseApi(detail, data);
          requestClient.get(apiUrl).then((res) => {
            if (transformData) {
              transformsAny[pageName]?.transformData(res);
            }
            formData.value = res;
            formApi.setValues(res);
          });
        } else {
          if (transformData) {
            transformsAny[pageName]?.transformData(data);
          }
          formData.value = data;
          formApi.setValues(data);
        }
      } else {
        drawerTitle.value = titles[0];
        formData.value = data;
        formApi.setValues(data);
      }
      drawerInit.value = true;
    }
  },
});
</script>
<template>
  <Drawer :title="drawerTitle">
    <Form v-if="drawerInit" />
  </Drawer>
</template>
<style lang="css" scoped>
:deep(.ant-tree-title) {
  .tree-actions {
    display: none;
    margin-left: 20px;
  }
}

:deep(.ant-tree-title:hover) {
  .tree-actions {
    display: flex;
    flex: auto;
    justify-content: flex-end;
    margin-left: 20px;
  }
}
</style>
