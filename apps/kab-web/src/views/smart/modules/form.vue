<script lang="ts" setup>
import { ref } from 'vue';

import { useVaticDrawer } from '@vatic/common-ui';

import { useVaticForm } from '#/adapter/form';
import { requestClient } from '#/api/request';

import { parseApi } from '../helper';

const emits = defineEmits(['success']);

const drawerInit = ref(false);
const drawerTitle = ref('');

const formData = ref();

let Form: any, formApi: any;

const [Drawer, drawerApi] = useVaticDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const bodyValues = await formApi.getValues();
    drawerApi.lock();

    const { create, update, keyField, mergeFields } = drawerApi.getSchema();
    const rawData = drawerApi.getData();

    const keyValue = rawData[keyField];
    bodyValues[keyField] = keyValue;

    mergeFields?.forEach((field: any) => {
      field.rawFields.forEach((key: string, index: number) => {
        bodyValues[key] = bodyValues[field.newField][index];
      });
    });

    (keyValue
      ? requestClient.patch(update, bodyValues)
      : requestClient.post(create, bodyValues)
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
        mergeFields,
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
            mergeFields?.forEach((field: any) => {
              res[field.newField] = field.rawFields.map(
                (key: string) => res[key],
              );
            });
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
