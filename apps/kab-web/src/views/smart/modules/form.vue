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

let Form: any, FormApi: any;

const [Drawer, DrawerApi] = useVaticDrawer({
  async onConfirm() {
    const { valid } = await FormApi.validate();
    if (!valid) return;
    const body = await FormApi.getValues();

    message.loading({
      content: '保存中...',
      duration: 0,
      key: 'is-form-submitting',
    });
    DrawerApi.lock();

    const { create, update, keyField, transformBody, pageName } =
      DrawerApi.getSchema();
    const rawData = DrawerApi.getData();

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
        DrawerApi.close();
        message.success({
          content: `保存成功`,
          duration: 2,
          key: 'is-form-submitting',
        });
      })
      .catch(() => {
        DrawerApi.unlock();
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
      } = DrawerApi.getSchema();
      const titles = title.split('&');

      [Form, FormApi] = useVaticForm({
        schema,
        showDefaultActions: false,
      });

      const data = DrawerApi.getData();
      FormApi.resetForm();

      if (data[keyField]) {
        drawerTitle.value = titles[1] || titles[0];
        if (detail) {
          const apiUrl = parseApi(detail, data);
          requestClient.get(apiUrl).then((res) => {
            if (transformData) {
              transformsAny[pageName]?.transformData(res);
            }
            formData.value = res;
            FormApi.setValues(res);
          });
        } else {
          if (transformData) {
            transformsAny[pageName]?.transformData(data);
          }
          formData.value = data;
          FormApi.setValues(data);
        }
      } else {
        drawerTitle.value = titles[0];
        formData.value = data;
        FormApi.setValues(data);
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
