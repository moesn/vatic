<script lang="ts" setup>
import { ref } from 'vue';

import { useVaticDrawer } from '@vatic/common-ui';

import { useVaticForm } from '#/adapter/form';
import { requestClient } from '#/api/request';
import * as functions from '#/views/smart/pipes';

import { parseApi } from '../helper';

const emits = defineEmits(['success']);

const functionsAny: any = functions;

const drawerInit = ref(false);
const drawerTitle = ref('');

const formData = ref();

let Form: any, formApi: any;

const [Drawer, drawerApi] = useVaticDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const body = await formApi.getValues();
    drawerApi.lock();

    const { create, update, keyField, transformBody } = drawerApi.getSchema();
    const rawData = drawerApi.getData();

    const keyValue = rawData[keyField];
    body[keyField] = keyValue;

    if (transformBody) {
      functionsAny[transformBody](body);
    }

    (keyValue
      ? requestClient.patch(update, body)
      : requestClient.post(create, body)
    )
      .then(() => {
        emits('success');
        drawerApi.close();
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
      } = drawerApi.getSchema();
      const titles = title.split('&');

      [Form, formApi] = useVaticForm({
        schema,
        showDefaultActions: false,
      });

      const data = drawerApi.getData();
      formApi.resetForm();
      formData.value = data;
      formApi.setValues(data);

      if (data[keyField]) {
        drawerTitle.value = titles[1] || titles[0];
        if (detail) {
          const apiUrl = parseApi(detail, data);
          requestClient.get(apiUrl).then((res) => {
            if (transformData) {
              functionsAny[transformData](res);
            }
            formData.value = res;
            formApi.setValues(res);
          });
        }
      } else {
        drawerTitle.value = titles[0];
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
