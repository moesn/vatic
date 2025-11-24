<script lang="ts" setup>
import type { Recordable } from '@vatic-core/typings';

import type {
  OnActionClickParams,
  VaticGridProps,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';

import { ref, watch } from 'vue';

import { Page, useVaticDrawer } from '@vatic/common-ui';
import { Plus } from '@vatic/icons';

import { VaticButtonGroup } from '@vatic-core/shadcn-ui';
import { cloneDeep } from '@vatic-core/shared/utils';

import { Button, message, Modal } from 'ant-design-vue';
import dayjs from 'dayjs';
import { getPageSchema } from 'vatic';

import { useVaticVxeGrid } from '#/adapter/vxe-table';
import { requestClient } from '#/api/request';

import { parseApi, parseFormSchema, parseTableColumns } from './helper';
import Form from './modules/form.vue';
import Table from './modules/table.vue';
import TimeLine from './modules/timeline.vue';
import * as transforms from './transforms';

const transformsAny: any = transforms;

const drawerWidth = ref('520px');
const pageInit = ref(false);
const pageSchema = ref<any>({});
const pageName = ref<string>('');

getPageSchema().then(({ schema, name }) => {
  pageSchema.value = schema;
  pageName.value = name;
});

let Grid: any, GridApi: any;

const [FormDrawer, FormDrawerApi] = useVaticDrawer({
  connectedComponent: Form,
  destroyOnClose: true,
  closeOnClickModal: false,
  closeOnPressEscape: false,
});

const [TableDrawer, TableDrawerApi] = useVaticDrawer({
  connectedComponent: Table,
  destroyOnClose: true,
  footer: false,
});

async function buildFormSchema(formSchema: any, row: any) {
  const { keyField } = pageSchema.value.table;
  formSchema.items.map((item: any) => {
    switch (item.disabled) {
      case 'update': {
        item.disabled = !!row[keyField];
        break;
      }
    }

    return item;
  });

  await parseFormSchema(formSchema.items, pageName.value, !!row[keyField]);
  return { ...formSchema, keyField, pageName: pageName.value };
}

async function openTable(row: any, tableSchema: any) {
  TableDrawerApi.setData(row, tableSchema).open();
}

async function onEdit(row: any, form: any) {
  const { items } = form;
  const data = { ...row };

  items.forEach((item: any) => {
    const { field, clearValue } = item;
    if (clearValue) {
      data[field] = null;
    }
  });

  FormDrawerApi.setData(
    data,
    await buildFormSchema(cloneDeep(form), data),
  ).open();
}

async function onCreate() {
  const data: any = {};
  const { items } = pageSchema.value.form;
  items.forEach((item: any) => {
    const { field, defaultValue } = item;
    if (defaultValue) {
      data[field] = defaultValue;
    }
  });
  await onEdit(data, pageSchema.value.form);
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
  const { delete: delUrl, keyField, nameField } = pageSchema.value.table;

  const hideLoading = message.loading({
    content: `正在删除 ${row[nameField]} ...`,
    duration: 0,
    key: 'action_process_msg',
  });

  requestClient
    .delete(delUrl, { data: { ids: [row[keyField]] } })
    .then(() => {
      message.success({
        content: `${row[nameField]} 删除成功`,
        key: 'action_process_msg',
      });
      refreshGrid();
    })
    .catch(() => {
      hideLoading();
    });
}

function onActionClick(e: OnActionClickParams) {
  drawerWidth.value = `${e.form?.width || e.table?.width || 520}px`;

  switch (e.code) {
    case 'delete': {
      onDelete(e.row);
      break;
    }
    case 'form': {
      onEdit(e.row, e.form);
      break;
    }
    case 'table': {
      openTable(e.row, e.table);
      break;
    }
    case 'Timeline': {
      onEdit(e.row, e.form);
      break;
    }
    case 'update': {
      onEdit(e.row, e.form);
      break;
    }
  }
}

function computeDisabled(condition: string, row: any) {
  if (condition) {
    if (condition.includes('!=')) {
      const keyVal: any = condition.split('!=');
      const rowValue = row[keyVal[0]].toString();
      const disableValues = keyVal[1].split('|');
      return !disableValues.includes(rowValue);
    } else if (condition.includes('=')) {
      const keyVal: any = condition.split('=');
      const rowValue = row[keyVal[0]].toString();
      const disableValues = keyVal[1].split('|');
      return disableValues.includes(rowValue);
    }
  }
  return false;
}

function operationDisabled(row: any, condition: string) {
  return computeDisabled(condition, row);
}

function updateDisabled(row: any) {
  const condition = pageSchema.value.table.disableUpdate;
  return computeDisabled(condition, row);
}

function deleteDisabled(row: any) {
  const condition = pageSchema.value.table.disableDelete;
  return computeDisabled(condition, row);
}

watch(
  () => pageSchema.value,
  async (schema) => {
    const { operations, table, form } = schema;
    const {
      api,
      columns,
      search: searchSchema,
      delete: remove,
      state,
      nameField,
      keyField,
      cellHeight,
      transformTableData,
    } = table;

    const { update } = form || {};

    const dateFields: any = [];
    const datetimeFields: any = [];
    columns.forEach((column: any) => {
      const { format, field } = column;
      switch (format) {
        case 'date': {
          dateFields.push(field);
          break;
        }
        case 'datetime': {
          datetimeFields.push(field);
          break;
        }
      }
    });

    parseTableColumns(columns);

    if (update || remove || operations) {
      let width = 12;
      const options = [];

      if (operations) {
        operations.forEach((opera: any) => {
          width += (opera.title.length + 1) * 14;
          let code = opera.type;
          if (opera.form) {
            code = 'form';
          } else if (opera.table) {
            code = 'table';
          }
          options.push({
            ...opera,
            code,
            text: opera.title,
            disabled: (row: any) => operationDisabled(row, opera.disabled),
          });
        });
      }
      if (update) {
        width += 45;
        options.push({
          code: 'update',
          text: '编辑',
          disabled: updateDisabled,
          form,
        });
      }

      if (remove) {
        width += 45;
        options.push({
          code: 'delete',
          text: '删除',
          disabled: deleteDisabled,
        });
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
            beforeChange: async (newStatus: boolean, row: any) => {
              const status: Recordable<string> = {
                false: '禁用',
                true: '启用',
              };
              try {
                await confirm(
                  `确定将【${row[nameField]}】的状态切换为 【${status[newStatus.toString()]}】？`,
                  `切换状态`,
                );

                const apiUrl = parseApi(state, row);
                const data: any = { state: newStatus };
                data[keyField] = row[keyField];

                await requestClient.patch(apiUrl, data);
                return true;
              } catch {
                return false;
              }
            },
          },
          props: {
            disabled: deleteDisabled,
          },
          name: 'CellSwitch',
        },
        field: 'enable',
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
      cellConfig: {
        height: cellHeight || 40,
      },
      height: 'auto',
      keepSource: true,
      proxyConfig: {
        ajax: {
          query: async ({ page, sort }, search) => {
            const params = {
              pageNo: page.currentPage,
              pageSize: page.pageSize,
              sortBy: sort.field,
              sortOrder: sort.order,
              ...search,
            };
            const resData = await requestClient.get(api, { params });

            if (dateFields.length > 0 || datetimeFields.length > 0) {
              resData.records.map((d: any) => {
                try {
                  dateFields.forEach((field: string) => {
                    d[field] = d[field] && dayjs(d[field]).format('YYYY-MM-DD');
                  });
                  datetimeFields.forEach((field: string) => {
                    d[field] =
                      d[field] && dayjs(d[field]).format('YYYY-MM-DD HH:mm:ss');
                  });
                } catch {}
                return d;
              });
            }

            if (transformTableData) {
              transformsAny[pageName.value]?.transformTableData(resData);
            }

            return resData;
          },
        },
        sort: true,
      },
      rowConfig: {
        keyField,
        isCurrent: true,
        isHover: true,
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
      treeConfig: {},
    };

    const options: VaticGridProps = { gridOptions };

    if (searchSchema) {
      await parseFormSchema(searchSchema);
      options.formOptions = {
        fieldMappingTime: searchSchema
          .filter((s: any) => s.type === 'RangePicker')
          .map((d: any) => [d.field, d.rangeFields]),
        schema: searchSchema,
        wrapperClass: 'grid-cols-6',
        showCollapseButton: false,
      };
    }

    [Grid, GridApi] = useVaticVxeGrid(options);

    pageInit.value = true;
  },
);

const isTreeGrid = () => {
  return pageSchema.value.table.columns.some((column: any) => column.treeNode);
};

const expandAll = () => {
  GridApi.grid?.setAllTreeExpand(true);
};

const collapseAll = () => {
  GridApi.grid?.setAllTreeExpand(false);
};

async function refreshGrid() {
  await GridApi.query();
  expandAll();
}
</script>

<template>
  <Page v-if="pageInit" auto-content-height>
    <div
      class="w-[1000px] w-[1080px] w-[1100px] w-[1200px] w-[1280px] w-[400px] w-[500px] w-[520px] w-[600px] w-[640px] w-[700px] w-[720px] w-[800px] w-[900px] w-[960px]"
    ></div>
    <FormDrawer @success="refreshGrid" />
    <TableDrawer :class="`w-[${drawerWidth}]`" />
    <Grid
      :table-title="pageSchema.table.title"
      :table-title-help="pageSchema.table.titleHelp"
    >
      <template #toolbar-tools>
        <VaticButtonGroup gap="10" class="vatic-check-button-group">
          <div v-if="isTreeGrid()" class="absolute left-2 top-14 z-10">
            <Button class="mr-2" size="small" type="link" @click="expandAll">
              展开
            </Button>
            <Button size="small" type="link" @click="collapseAll"> 折叠</Button>
          </div>
          <!--          <Button type="link" v-if="pageSchema.table?.template">-->
          <!--            下载模版-->
          <!--          </Button>-->
          <Button
            type="primary"
            @click="onCreate"
            v-if="pageSchema.form?.create"
          >
            <Plus class="size-5" />
            新增
          </Button>
        </VaticButtonGroup>
      </template>

      <template #timeline>
        <TimeLine />
      </template>
    </Grid>
  </Page>
</template>
