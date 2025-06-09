<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemRoleApi } from '#/api';

import { Page } from '@vatic/common-ui';

import { useVaticVxeGrid } from '#/adapter/vxe-table';
import { getRoleList } from '#/api';

const [Grid] = useVaticVxeGrid({
  formOptions: {
    showCollapseButton: false,
    compact: true,
    fieldMappingTime: [['createTime', ['startTime', 'endTime']]],
    schema: [
      {
        component: 'Select',
        fieldName: 'options',
        label: '车辆类型',
        hideLabel: true,
        componentProps: {
          allowClear: true,
          filterOption: true,
          options: [
            {
              label: '选项1',
              value: '1',
            },
            {
              label: '选项2',
              value: '2',
            },
          ],
          placeholder: '请选择车辆类型',
          showSearch: true,
        },
      },
      {
        component: 'Input',
        fieldName: 'options',
        label: '车牌号',
        hideLabel: true,
      },
      {
        component: 'RangePicker',
        fieldName: 'createTime',
        label: '起止日期',
        hideLabel: true,
        formItemClass: 'col-span-2',
      },
      {
        component: 'Select',
        fieldName: 'options',
        label: '统计维度',
        hideLabel: true,
        componentProps: {
          allowClear: true,
          filterOption: true,
          options: [
            {
              label: '日',
              value: '1',
            },
            {
              label: '月',
              value: '30',
            },
          ],
          placeholder: '请选择统计维度',
          showSearch: true,
        },
      },
    ],
    actionWrapperClass: 'text-left col-span-1',
    wrapperClass: 'grid-cols-6',
  },
  gridOptions: {
    columns: [
      {
        field: 'name',
        title: '视频设备',
        width: 200,
      },
      {
        field: 'id',
        title: '车牌号',
        width: 200,
      },
      {
        field: 'id',
        title: '抓拍时间',
        width: 200,
      },
      {
        field: 'id',
        title: '车辆类型',
        width: 200,
      },
      {
        field: 'id',
        title: '通行方向',
        width: 200,
      },
      {
        field: 'id',
        title: '抓拍图片',
        width: 200,
      },
    ],
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          return await getRoleList({
            page: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          });
        },
      },
    },
    rowConfig: {
      keyField: 'id',
    },
    exportConfig: {
      excludeFields: ['operation'],
    },
    footerClass: 'h-1/2',
    toolbarConfig: {
      custom: true,
      export: true,
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions<SystemRoleApi.SystemRole>,
});
</script>
<template>
  <Page auto-content-height footer-class="footer">
    <template #footer>
      <div></div>
    </template>
    <Grid table-title="车辆识别列表" class="h-2/3" />
  </Page>
</template>
<style scoped lang="scss">
:deep .footer {
  height: calc(34% - 32px);
  margin: 16px;
}
</style>
