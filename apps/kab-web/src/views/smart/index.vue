<script lang="ts" setup>
import type { VxeGridProps } from '@vatic/plugins/src/vxe-table/types';

import type { Recordable } from '@vatic-core/typings';

import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';

import { ref, watch } from 'vue';

import { Page, useVaticDrawer } from '@vatic/common-ui';
import { Plus } from '@vatic/icons';
import { getPageSchema } from '@vatic/smart';

import { Button, message, Modal } from 'ant-design-vue';

import { useVaticVxeGrid } from '#/adapter/vxe-table';
import { requestClient } from '#/api/request';

import { parseApi, parseFormSchema, parseTableColumns } from './helper';
import Form from './modules/form.vue';

const pageInit = ref(false);
const pageSchema = ref<any>({});
getPageSchema().then((schema) => (pageSchema.value = schema));

let Grid: any, gridApi: any;

const [FormDrawer, formDrawerApi] = useVaticDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
});

function onRefresh() {
  gridApi.query();
}

function mergeFormSchema(formSchema: any) {
  const { keyField } = pageSchema.value.table;
  return { ...formSchema, keyField };
}

function onCreate() {
  formDrawerApi.setData({}, mergeFormSchema(pageSchema.value.form)).open();
}

function onEdit(row: any, form: any) {
  formDrawerApi.setData(row, mergeFormSchema(form)).open();
}

function confirm(content: string, title: string) {
  return new Promise((resolve, reject) => {
    Modal.confirm({
      content,
      onCancel() {
        reject(new Error('已取消'));
      },
      onOk() {
        resolve(true);
      },
      title,
    });
  });
}

function onDelete(row: any) {
  const { url } = parseApi(pageSchema.value.table.delete, row);

  const hideLoading = message.loading({
    content: `正在删除 ${row.name} ...`,
    duration: 0,
    key: 'action_process_msg',
  });
  requestClient
    .delete(url)
    .then(() => {
      message.success({
        content: `${row.name} 删除成功`,
        key: 'action_process_msg',
      });
      onRefresh();
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
      onEdit(e.row, e.form);
      break;
    }
  }
}

watch(
  () => pageSchema.value,
  (schema) => {
    const { operations, table, form } = schema;
    const {
      api,
      columns,
      search,
      edit,
      delete: remove,
      state,
      nameField,
    } = table;

    parseTableColumns(columns);

    if (edit || remove || operations) {
      let width = 12;
      const options = [];

      if (operations) {
        operations.forEach((opera: any) => {
          width += (opera.title.length + 1) * 14;
          options.push({
            ...opera,
            code: opera.form ? 'edit' : '',
            text: opera.title,
          });
        });
      }

      if (edit) {
        width += 45;
        options.push({
          code: 'edit',
          text: '编辑',
          form,
        });
      }

      if (remove) {
        width += 45;
        options.push('delete');
      }

      columns.push({
        cellRender: {
          attrs: {
            nameField,
            nameTitle: '数据',
            onClick: onActionClick,
          },
          options,
          name: 'CellOperation',
        },
        field: 'operation',
        fixed: 'right',
        title: '操作',
        width,
      });
    }

    if (state) {
      columns.push({
        cellRender: {
          attrs: {
            beforeChange: async (newStatus: number, row: any) => {
              const status: Recordable<string> = {
                0: '禁用',
                1: '启用',
              };
              try {
                await confirm(
                  `确定将${row[nameField]}的状态切换为 【${status[newStatus.toString()]}】？`,
                  `切换状态`,
                );

                const { url } = parseApi(state, row);

                await requestClient.put(url, { status: newStatus });
                return true;
              } catch {
                return false;
              }
            },
          },
          name: 'CellSwitch',
        },
        field: 'status',
        title: '状态',
        width: 100,
      });
    }

    const gridOptions: VxeTableGridOptions = {
      columns,
      checkboxConfig: {
        highlight: true,
        labelField: 'name',
      },
      exportConfig: {
        excludeFields: ['operation'],
      },
      height: 'auto',
      keepSource: true,
      proxyConfig: {
        ajax: {
          query: async ({ page, sort }, search) => {
            const params = {
              page: page.currentPage,
              pageSize: page.pageSize,
              sortBy: sort.field,
              sortOrder: sort.order,
              ...search,
            };
            return await requestClient.get(api, { params });
          },
        },
        sort: true,
      },
      rowConfig: {
        keyField: 'id',
      },
      sortConfig: {
        defaultSort: { field: 'deviceName', order: 'desc' },
        remote: true,
      },
      toolbarConfig: {
        custom: true,
        refresh: { code: 'query' },
        search: true,
        zoom: true,
        export: table.export,
        import: table.import,
      },
    };

    const options: VxeGridProps = { gridOptions };

    if (search) {
      options.formOptions = {
        fieldMappingTime: search
          .filter((s: any) => s.type === 'RangePicker')
          .map((d: any) => [d.field, d.rangeFields]),
        schema: parseFormSchema(search),
      };
    }

    [Grid, gridApi] = useVaticVxeGrid(options);
    console.warn(options);
    pageInit.value = true;
  },
);
</script>

<template>
  <Page v-if="pageInit" auto-content-height>
    <FormDrawer />
    <Grid
      :table-title="pageSchema.table.title"
      :table-title-help="pageSchema.table.titleHelp"
    >
      <template #toolbar-tools>
        <Button type="primary" @click="onCreate" v-if="pageSchema.table.create">
          <Plus class="size-5" />
          新增
        </Button>
      </template>
    </Grid>
  </Page>
</template>
