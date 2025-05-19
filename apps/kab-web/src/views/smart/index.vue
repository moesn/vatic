<script lang="ts" setup>
import type { OnActionClickParams, VxeGridProps } from '#/adapter/vxe-table';

import { ref, watch } from 'vue';

import { Page, useVaticDrawer } from '@vatic/common-ui';
import { getPageOptions } from '@vatic/smart';

import { Button, message } from 'ant-design-vue';

import { useVaticVxeGrid } from '#/adapter/vxe-table';
import { deleteRole } from '#/api';
import { requestClient } from '#/api/request';

import Form from './modules/form.vue';

const pageInit = ref(false);
const pageOptions = ref<any>({});
getPageOptions().then((options) => (pageOptions.value = options));

let Grid: any, gridApi: any;

const [FormDrawer, formDrawerApi] = useVaticDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});

function onEdit(row: any) {
  formDrawerApi.setData(row).open();
}

function onDelete(row: any) {
  const hideLoading = message.loading({
    content: `正在删除 ${row.name} ...`,
    duration: 0,
    key: 'action_process_msg',
  });
  deleteRole(row.id)
    .then(() => {
      message.success({
        content: `${row.name} 删除成功`,
        key: 'action_process_msg',
      });
      gridApi.query();
    })
    .catch(() => {
      hideLoading();
    });
}

function onActionClick(e: OnActionClickParams) {
  switch (e.code) {
    case 'delete': {
      onDelete(e.row);
      break;
    }
    case 'edit': {
      onEdit(e.row);
      break;
    }
  }
}

watch(
  () => pageOptions.value,
  (options) => {
    const { api, columns, edit, remove, nameField } = options.table;
    if (edit || remove) {
      let width = 12;
      if (edit) {
        width += 45;
      }
      if (remove) {
        width += 45;
      }
      columns.push({
        cellRender: {
          attrs: {
            nameField,
            nameTitle: '数据',
            onClick: onActionClick,
          },
          name: 'CellOperation',
        },
        field: 'operation',
        fixed: 'right',
        title: '操作',
        width,
      });
    }

    const gridOptions: VxeGridProps = {
      columns,
      checkboxConfig: {
        highlight: true,
        labelField: 'name',
      },
      exportConfig: {},
      height: 'auto',
      keepSource: true,
      proxyConfig: {
        ajax: {
          query: async ({ page, sort }) => {
            const params = {
              page: page.currentPage,
              pageSize: page.pageSize,
              sortBy: sort.field,
              sortOrder: sort.order,
            };
            return await requestClient.get(api, { params });
          },
        },
        sort: true,
      },
      sortConfig: {
        remote: true,
      },
      toolbarConfig: {
        custom: true,
        export: true,
        refresh: { code: 'query' },
        zoom: true,
      },
    };

    [Grid, gridApi] = useVaticVxeGrid({
      gridOptions,
    });

    pageInit.value = true;
  },
);
</script>

<template>
  <Page v-if="pageInit" auto-content-height>
    <FormDrawer />
    <Grid
      :table-title="pageOptions.table.title"
      :table-title-help="pageOptions.table.titleHelp"
    >
      <template #toolbar-tools>
        <Button class="mr-2" type="primary" @click="() => gridApi.query()">
          刷新当前页面
        </Button>
        <Button type="primary" @click="() => gridApi.reload()">
          刷新并返回第一页
        </Button>
      </template>
    </Grid>
  </Page>
</template>
