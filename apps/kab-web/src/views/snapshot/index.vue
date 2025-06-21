<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemRoleApi } from '#/api';

import { Page } from '@vatic/common-ui';

import dayjs from 'dayjs';

import { useVaticVxeGrid } from '#/adapter/vxe-table';
import { getDictListApi } from '#/views/data';
import { getSnapshotListApi, getSnapshotStatsApi } from '#/views/snapshot/data';

const [Grid] = useVaticVxeGrid({
  formOptions: {
    showCollapseButton: false,
    compact: true,
    fieldMappingTime: [['searchTime', ['beginTime', 'endTime']]],
    schema: [
      {
        component: 'ApiSelect',
        fieldName: 'vehicleType',
        label: '车辆类型',
        componentProps: {
          api: () => getDictListApi(16),
          allowClear: true,
          filterOption: true,
          showSearch: true,
          labelField: 'name',
          valueField: 'code',
          placeholder: '请选择车辆类型',
        },
      },
      {
        component: 'Select',
        fieldName: 'dimension',
        label: '统计维度',
        formItemClass: 'col-span-1',
        defaultValue: 1,
        componentProps: {
          options: [
            {
              label: '日',
              value: 1,
            },
            {
              label: '月',
              value: 3,
            },
          ],
          placeholder: '请选择时间维度',
          showSearch: true,
        },
      },
      {
        component: 'RangePicker',
        fieldName: 'searchTime',
        label: '起止日期',
        formItemClass: 'col-span-2',
        defaultValue: [dayjs().add(-30, 'd'), dayjs()],
        componentProps: {
          presets: [
            { label: '最近7天', value: [dayjs().add(-7, 'd'), dayjs()] },
            { label: '最近15天', value: [dayjs().add(-15, 'd'), dayjs()] },
            { label: '最近30天', value: [dayjs().add(-30, 'd'), dayjs()] },
          ],
        },
        dependencies: {
          if: (formData: any) => {
            return formData.dimension === 1;
          },
          triggerFields: ['dimension'],
        },
      },
      {
        component: 'RangePicker',
        fieldName: 'searchTime',
        label: '起止月份',
        formItemClass: 'col-span-2',
        componentProps: {
          picker: 'month',
          presets: [
            { label: '最近半年', value: [dayjs().add(-6, 'm'), dayjs()] },
            { label: '最近一年', value: [dayjs().add(-12, 'm'), dayjs()] },
          ],
        },
        dependencies: {
          if: (formData: any) => {
            return formData.dimension === 3;
          },
          triggerFields: ['dimension'],
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
      },
      {
        field: 'plate',
        title: '车牌号',
      },
      {
        field: 'captureTime',
        title: '抓拍时间',
      },
      {
        field: 'vehicleType',
        title: '车辆类型',
      },
      {
        field: 'direction',
        title: '通行方向',
      },
      {
        field: 'picUrl',
        title: '抓拍图片',
        width: 150,
        cellRender: {
          name: 'CellImage',
        },
      },
    ],
    height: 'auto',
    keepSource: true,
    cellConfig: {
      height: 80,
    },
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          getSnapshotStatsApi(formValues).then((res) =>
            renderChart(res, formValues.dimension),
          );
          return await getSnapshotListApi({
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

let snapshotChart: any;

function renderChart(data: any, dimension: number) {
  snapshotChart?.dispose();
  snapshotChart = echarts.init(document.querySelector('#snapshot-chart'));
  const legendData: any = Object.keys(data);
  const xData = [];
  if (legendData && legendData.length > 0) {
    xData.push(
      ...data[legendData[0]].map((d: any) =>
        dimension === 1 ? d.captureTime.slice(5) : d.captureTime.slice(0, 7),
      ),
    );
  }

  const option = {
    legend: {
      data: legendData,
      top: 0,
    },
    grid: {
      left: 40,
      right: 20,
      top: 30,
      bottom: 20,
    },
    xAxis: {
      type: 'category',
      data: xData,
    },
    yAxis: {
      type: 'value',
      interval: 1,
    },
    series: legendData.map((lgd: string) => {
      return {
        name: lgd,
        type: 'line',
        data: data[lgd].map((d: any) => d.total),
      };
    }),
  };
  snapshotChart.setOption(option, true);
}
</script>
<template>
  <Page auto-content-height footer-class="footer">
    <template #footer>
      <div id="snapshot-chart" class="h-full w-full"></div>
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
