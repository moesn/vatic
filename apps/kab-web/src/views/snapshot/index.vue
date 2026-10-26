<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemRoleApi } from '#/api';

import { nextTick, ref } from 'vue';

import { Page } from '@vatic/common-ui';
import { IconifyIcon } from '@vatic/icons';

import { VaticButton } from '@vatic-core/shadcn-ui';

import dayjs from 'dayjs';

import { useVaticVxeGrid } from '#/adapter/vxe-table';
import { getDictListApi } from '#/views/data';
import { getSnapshotListApi, getSnapshotStatsApi } from '#/views/snapshot/data';

const [Grid, GridApi] = useVaticVxeGrid({
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
        field: 'videoDevicesName',
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
          // 统计图默认折叠，展开时才拉取图表数据（避免隐藏容器初始化 echarts）
          if (chartExpanded.value) {
            loadSnapshotStats();
          }
          return await getSnapshotListApi({
            pageNo: page.currentPage,
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
      // zoom: true,
    },
  } as VxeTableGridOptions<SystemRoleApi.SystemRole>,
});

let snapshotChart: any;

/** 统计图展开状态：默认折叠 */
const chartExpanded = ref(false);
const chartLoading = ref(false);

/** 当前列表搜索条件（图表与列表保持同一筛选） */
function currentFormValues(): any {
  return GridApi.formApi?.getLatestSubmissionValues?.() ?? {};
}

/** 加载统计图数据（仅在展开状态下调用） */
async function loadSnapshotStats() {
  if (!chartExpanded.value) return;
  chartLoading.value = true;
  try {
    const formValues = currentFormValues();
    const res = await getSnapshotStatsApi(formValues);
    renderChart(res, formValues.dimension);
  } catch {
    // 错误提示由全局响应拦截器统一处理
  } finally {
    chartLoading.value = false;
  }
}

/** 展开 / 折叠统计图 */
async function toggleChart() {
  chartExpanded.value = !chartExpanded.value;
  if (chartExpanded.value) {
    await nextTick();
    loadSnapshotStats();
    snapshotChart?.resize();
  }
}

function renderChart(data: any, dimension: number) {
  const el = document.querySelector('#snapshot-chart');
  if (!el) return;
  snapshotChart?.dispose();
  snapshotChart = echarts.init(el);
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
  <Page auto-content-height>
    <div class="flex h-full flex-col">
      <!-- 统计图（默认折叠） -->
      <div class="mb-4 flex-none rounded-md bg-white shadow-sm">
        <div
          class="flex items-center justify-between border-b border-gray-100 px-4 py-2"
        >
          <span class="flex items-center text-sm font-medium text-gray-700">
            <IconifyIcon class="text-primary mr-2" icon="mdi:chart-line" />
            识别统计
          </span>
          <VaticButton size="sm" type="text" @click="toggleChart">
            <IconifyIcon
              :icon="chartExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'"
            />
            {{ chartExpanded ? '收起' : '展开' }}
          </VaticButton>
        </div>
        <div v-if="chartExpanded" class="p-2">
          <div
            v-show="!chartLoading"
            id="snapshot-chart"
            class="h-56 w-full"
          ></div>
          <div
            v-if="chartLoading"
            class="flex h-56 w-full items-center justify-center text-gray-400"
          >
            加载中...
          </div>
        </div>
      </div>

      <!-- 车辆识别列表 -->
      <div class="min-h-0 flex-1">
        <Grid table-title="车辆识别列表" />
      </div>
    </div>
  </Page>
</template>
