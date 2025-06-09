<script lang="ts" setup>
import type { DataNode } from 'ant-design-vue/es/tree';

import type { Recordable } from '@vatic/types';

import { ref } from 'vue';

import { useVaticDrawer, VaticTree } from '@vatic/common-ui';
import { IconifyIcon } from '@vatic/icons';

import { Spin } from 'ant-design-vue';

import { useVaticForm } from '#/adapter/form';
import { requestClient } from '#/api/request';
import { $t } from '#/locales';

import { parseFormSchema } from '../helper';

const emits = defineEmits(['success']);

const permissions = ref<DataNode[]>([]);
const loadingPermissions = ref(false);

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

    const { create, update, keyField } = drawerApi.getSchema();
    const rawData = drawerApi.getData();

    const keyValue = rawData[keyField];
    bodyValues[keyField] = keyValue;

    (keyValue
      ? requestClient[update.method](update.url, bodyValues)
      : requestClient[create.method](create.url, bodyValues)
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
      const { items, title, keyField } = drawerApi.getSchema();
      const titles = title.split('&');

      [Form, formApi] = useVaticForm({
        schema: parseFormSchema(items),
        showDefaultActions: false,
      });

      const data = drawerApi.getData();
      formApi.resetForm();

      if (data[keyField]) {
        drawerTitle.value = titles[1] || titles[0];
        formData.value = data;
        formApi.setValues(data);
      } else {
        drawerTitle.value = titles[0];
      }

      drawerInit.value = true;
    }
  },
});

function getNodeClass(node: Recordable<any>) {
  const classes: string[] = [];
  if (node.value?.type === 'button') {
    classes.push('inline-flex');
    if (node.index % 3 >= 1) {
      classes.push('!pl-0');
    }
  }

  return classes.join(' ');
}
</script>
<template>
  <Drawer :title="drawerTitle">
    <Form v-if="drawerInit">
      <template #permissions="slotProps">
        <Spin :spinning="loadingPermissions" wrapper-class-name="w-full">
          <VaticTree
            :tree-data="permissions"
            multiple
            bordered
            :default-expanded-level="2"
            :get-node-class="getNodeClass"
            v-bind="slotProps"
            value-field="id"
            label-field="meta.title"
            icon-field="meta.icon"
          >
            <template #node="{ value }">
              <IconifyIcon v-if="value.meta.icon" :icon="value.meta.icon" />
              {{ $t(value.meta.title) }}
            </template>
          </VaticTree>
        </Spin>
      </template>
    </Form>
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
