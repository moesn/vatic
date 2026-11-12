<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemRoleApi } from '#/api';

import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';

import { Page } from '@vatic/common-ui';
import { IconifyIcon } from '@vatic/icons';

import { Button, message, Spin } from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVaticVxeGrid } from '#/adapter/vxe-table';
import { getDictListApi } from '#/views/data';
import {
  exportSnapshotApi,
  getSnapshotListApi,
  getSnapshotStatsApi,
} from '#/views/snapshot/data';

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
        defaultValue: [dayjs().add(-6, 'd'), dayjs()],
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
          // 表格查询不联动统计图：趋势图仅在维度切换、展开及首次加载时请求
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
      // export: true,
      search: true,
      // zoom: true,
    },
  } as VxeTableGridOptions<SystemRoleApi.SystemRole>,
});

// region 识别统计图
const chartRef = ref<HTMLElement | null>(null);
let snapshotChart: any = null;
const chartLoading = ref(false);
/** 统计图展开状态：默认展开 */
const chartExpanded = ref(true);
/** 统计图总条数（各车辆类型合计） */
const chartTotal = ref(0);
/** 是否无统计数据 */
const chartEmpty = computed(() => chartTotal.value === 0);

/** 统计维度：当天 / 近一周 / 近一月（默认近一周） */
const chartDimension = ref<number>(2);
const dimensionOptions = [
  { label: '当天', value: 1 },
  { label: '近一周', value: 2 },
  { label: '近一月', value: 3 },
];

/** 维度对应的查询时间范围（用于联动下方搜索表单） */
function rangeByDimension(dim: number): [any, any] {
  const today = dayjs();
  switch (dim) {
    case 1: {
      return [today, today];
    }
    case 3: {
      return [today.add(-1, 'month'), today];
    }
    default: {
      return [today.add(-6, 'd'), today];
    }
  }
}

/** 当前维度文案，用于标题展示 */
const currentDimensionLabel = computed(
  () =>
    dimensionOptions.find((d) => d.value === chartDimension.value)?.label ?? '',
);

/** 多系列配色（与 video 页统计图保持一致） */
const chartSeriesColors = [
  '#1890ff',
  '#ff4d4f',
  '#faad14',
  '#52c41a',
  '#722ed1',
];

function initChart() {
  const echarts = (window as any).echarts;
  if (!echarts || !chartRef.value) return;
  snapshotChart = echarts.init(chartRef.value);
}

/**
 * 统计时间格式化（后端 time 字段随维度变化）：
 * - 当天维度：纯时间 "00:00" / "00:00:00"
 * - 近一周 / 近一月：日期 "2026-10-20"
 * - 按小时维度：日期时间 "2026-10-20 14:00:00"（或 T 分隔）
 * 统一压缩为 "00:00" / "10-20" / "10-20 14:00"，避免 x 轴标签过长
 */
function formatStatTime(value?: null | string): string {
  if (!value) return '';
  const s = String(value).replace('T', ' ').trim();
  // 纯时间（不含日期）：当天维度，去掉秒
  if (!s.includes('-')) {
    return s.length > 5 ? s.slice(0, 5) : s;
  }
  // 含日期：取月日，带时分秒的补上时分
  return s.length > 10 ? s.slice(5, 16) : s.slice(5);
}

function renderChart(data: any) {
  if (!snapshotChart) initChart();
  if (!snapshotChart) return;

  const grouped: Record<string, any[]> = data ?? {};

  // 只剔除完全没有数据的类型，其余按后端返回原样绘制
  const legendData = Object.keys(grouped).filter(
    (type) => (grouped[type] ?? []).length > 0,
  );

  // 以数据条数最多的系列作为 x 轴基准（各车型统计网格一致）
  let baseType = legendData[0] ?? '';
  legendData.forEach((type) => {
    if ((grouped[type] ?? []).length > (grouped[baseType] ?? []).length) {
      baseType = type;
    }
  });
  const times = (grouped[baseType] ?? []).map((d: any) =>
    formatStatTime(d.time ?? d.captureTime),
  );

  // 各类型合计，用于标题栏展示与空数据判断
  let total = 0;
  legendData.forEach((type) => {
    (grouped[type] ?? []).forEach((d: any) => {
      total += Number(d.total ?? 0);
    });
  });
  chartTotal.value = total;

  // 无数据时清空旧图，避免切换维度后仍显示上一次的数据
  if (legendData.length === 0 || total === 0) {
    snapshotChart.clear();
    return;
  }

  // 构建多系列数据（样式参数与 video 页预警统计图保持一致）
  const series = legendData.map((type, idx) => {
    const color = chartSeriesColors[idx % chartSeriesColors.length];
    const dataMap = new Map(
      (grouped[type] ?? []).map((d: any) => [
        formatStatTime(d.time ?? d.captureTime),
        Number(d.total ?? 0),
      ]),
    );
    return {
      name: type,
      type: 'line',
      data: times.map((t) => dataMap.get(t) ?? 0),
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { width: 2, color },
      itemStyle: { color },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            {
              offset: 0,
              color: color.replace(')', ',0.25)').replace('rgb', 'rgba'),
            },
            { offset: 1, color: 'rgba(255,255,255,0.01)' },
          ],
        },
      },
    };
  });

  snapshotChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: {
      data: legendData,
      top: 0,
      textStyle: { color: '#666' },
    },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'category',
      data: times,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#999', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#999', fontSize: 11 },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
    },
    series,
  });
}

/** 当前列表搜索条件（图表与列表保持同一筛选；取实时值，兼容程序化 setValues 联动） */
async function currentFormValues(): Promise<any> {
  return (await GridApi.formApi?.getValues?.()) ?? {};
}

/** 加载统计图数据（仅在展开状态下调用） */
async function loadSnapshotStats() {
  // 图表收起时不请求，展开时再加载
  if (!chartExpanded.value) return;

  chartLoading.value = true;
  try {
    const formValues = await currentFormValues();
    // 维度以图表头部的切换按钮为准，覆盖搜索表单中的维度
    const data = await getSnapshotStatsApi({
      ...formValues,
      dimension: chartDimension.value,
    });
    renderChart(data);
  } catch {
    // 错误提示由全局响应拦截器统一处理
  } finally {
    chartLoading.value = false;
  }
}

// 切换统计维度：联动下方搜索表单的时间范围并触发表格查询，
// 同时单独刷新趋势图（表格查询不再联动统计图）
watch(chartDimension, async (dim) => {
  const searchTime = rangeByDimension(dim);
  await GridApi.formApi?.setValues({ searchTime });
  // query 使用的是最近一次提交值，setValues 后需手动同步，否则接口仍传旧时间段
  const formValues = await GridApi.formApi?.getValues?.();
  GridApi.formApi?.setLatestSubmissionValues?.(formValues ?? {});
  GridApi.query();
  loadSnapshotStats();
});

// region 导出 Excel
const exporting = ref(false);

/** 导出车辆识别记录：查询参数与列表接口一致（最近提交的筛选条件，已映射时间段字段） */
async function handleExport() {
  if (exporting.value) return;
  exporting.value = true;
  try {
    const formValues =
      (await GridApi.formApi?.getLatestSubmissionValues?.()) ?? {};
    const blob: Blob = await exportSnapshotApi({ ...formValues });
    if (blob?.type?.includes('json')) {
      message.error('导出失败，请稍后重试');
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `车辆识别列表_${dayjs().format('YYYYMMDDHHmmss')}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  } catch {
    // 请求错误提示由全局响应拦截器统一处理
  } finally {
    exporting.value = false;
  }
}
// endregion

/** 展开/收起统计图，展开后重算图表尺寸并加载数据 */
async function toggleChart() {
  chartExpanded.value = !chartExpanded.value;
  if (chartExpanded.value) {
    await nextTick();
    snapshotChart?.resize();
    loadSnapshotStats();
  }
}

function handleChartResize() {
  snapshotChart?.resize();
}

onMounted(() => {
  window.addEventListener('resize', handleChartResize);
  // 统计图默认展开：首次加载趋势图数据（表格查询已不联动统计图）
  loadSnapshotStats();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleChartResize);
  snapshotChart?.dispose();
});
// endregion
</script>
<template>
  <Page auto-content-height>
    <div class="flex h-full flex-col">
      <!-- 识别统计图：默认收起，点击标题展开 -->
      <div class="mb-4 flex-none rounded border border-gray-200 bg-white p-4">
        <div
          class="flex cursor-pointer select-none items-center justify-between"
          @click="toggleChart"
        >
          <span
            class="flex items-center gap-2 text-sm font-medium text-gray-700"
          >
            <IconifyIcon
              class="text-primary"
              icon="mdi:chart-timeline-variant"
            />
            识别统计（{{ currentDimensionLabel }}）
            <IconifyIcon
              class="text-gray-400 transition-transform"
              :class="chartExpanded ? 'rotate-180' : ''"
              icon="mdi:chevron-down"
            />
          </span>
          <div class="flex items-center gap-3" @click.stop>
            <span class="text-sm text-gray-500">
              共 {{ chartTotal }} 条识别记录
            </span>
            <div class="flex items-center gap-1">
              <Button
                v-for="opt in dimensionOptions"
                :key="opt.value"
                size="small"
                :type="chartDimension === opt.value ? 'primary' : 'default'"
                @click="chartDimension = opt.value"
              >
                {{ opt.label }}
              </Button>
            </div>
          </div>
        </div>
        <Spin v-show="chartExpanded" :spinning="chartLoading">
          <!-- 图表容器固定高度，空状态覆盖其上，避免无数据时区域变高 -->
          <div class="relative h-[250px] w-full">
            <div ref="chartRef" class="absolute inset-0"></div>
            <div
              v-if="!chartLoading && chartEmpty"
              class="absolute inset-0 flex items-center justify-center text-sm text-gray-400"
            >
              暂无统计数据
            </div>
          </div>
        </Spin>
      </div>

      <!-- 车辆识别列表 -->
      <div class="min-h-0 flex-1">
        <Grid table-title="车辆识别列表">
          <template #toolbar-tools>
            <Button :loading="exporting" @click="handleExport">导出</Button>
          </template>
        </Grid>
      </div>
    </div>
  </Page>
</template>
