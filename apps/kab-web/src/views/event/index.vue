<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import { computed, h, onMounted, reactive, ref, watch } from 'vue';

import { useVaticModal } from '@vatic/common-ui';

import { Button, Image, Input, message, Select, Space, Table, Tag } from 'ant-design-vue';
import { RangePicker } from 'ant-design-vue';

import { useVaticForm } from '#/adapter/form';
import {
  dispatchApi,
  disposeApi,
  getEventListApi,
  getEventStatsApi,
  getStaffListApi,
} from '#/views/event/data';

// region 搜索条件
const searchForm = reactive({
  eventType: undefined as string | undefined,
  location: '',
  level: undefined as string | undefined,
  status: undefined as string | undefined,
  timeRange: null as null | [string, string],
});

const eventTypeOptions = ref<{ label: string; value: string }[]>([]);
const staffList = ref<{ label: string; value: number }[]>([]);

/** 事件级别配色 */
const levelColorMap: Record<string, string> = {
  低: 'blue',
  中: 'orange',
  高: 'red',
};

/** 事件状态配色 */
const statusColorMap: Record<string, string> = {
  未派发: 'default',
  待确认: 'gold',
  处理中: 'processing',
  待复核: 'purple',
  已完成: 'green',
};

const levelOptions = [
  { label: '低', value: '低' },
  { label: '中', value: '中' },
  { label: '高', value: '高' },
];

const statusOptions = [
  { label: '未派发', value: '未派发' },
  { label: '待确认', value: '待确认' },
  { label: '处理中', value: '处理中' },
  { label: '待复核', value: '待复核' },
  { label: '已完成', value: '已完成' },
];

getEventStatsApi().then((res: any[]) => {
  eventTypeOptions.value = res.map((d: any) => ({
    label: d.eventType ?? d.label,
    value: d.eventType ?? d.value,
  }));
});

getStaffListApi().then((res: any[]) => {
  staffList.value = res.map((d: any) => ({
    label: d.name,
    value: d.id,
  }));
});
// endregion

// region 表格
const eventLoading = ref(false);
const eventRecords = ref<any[]>([]);
const eventTotal = ref(0);
const eventPage = reactive({ pageNo: 1, pageSize: 10 });
const selectedRowKeys = ref<number[]>([]);

const selectedEvents = computed(() =>
  eventRecords.value
    .filter((r) => selectedRowKeys.value.includes(r.id))
    .map((r) => ({
      eventType: r.eventType,
      location: r.location,
      latitude: r.latitude,
      longitude: r.longitude,
    })),
);

const eventColumns: TableColumnsType<any> = [
  {
    title: '图片',
    dataIndex: 'imageUrl',
    width: 90,
    customRender: ({ record }) => {
      const url = (record.imageUrl ?? '').replaceAll(/^`|`$/g, '');
      return url ? h(Image, { src: url, width: 70, height: 50, style: { objectFit: 'cover' } }) : '-';
    },
  },
  { title: '事件类型', dataIndex: 'eventType', width: 140 },
  { title: '事件位置', dataIndex: 'location', width: 160 },
  {
    title: '发现时间',
    dataIndex: 'captureTime',
    width: 170,
    customRender: ({ record }) => formatTime(record.captureTime),
  },
  {
    title: '级别',
    dataIndex: 'level',
    width: 80,
    customRender: ({ record }) =>
      record.level ? h(Tag, { color: levelColorMap[record.level] ?? 'default' }, () => record.level) : '-',
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 100,
    customRender: ({ record }) =>
      record.status ? h(Tag, { color: statusColorMap[record.status] ?? 'default' }, () => record.status) : '-',
  },
  { title: '处理人', dataIndex: 'assignedTo', width: 100, customRender: ({ record }) => {
    if (!record.assignedTo || record.assignedTo === -1) return '-';
    const staff = staffList.value.find((s) => s.value === record.assignedTo);
    return staff?.label ?? record.assignedTo;
  }},
  { title: '备注', dataIndex: 'remark', ellipsis: true },
  {
    title: '操作',
    key: 'action',
    width: 140,
    fixed: 'right',
    customRender: ({ record }) =>
      h(Space, {}, () => [
        h(
          Button,
          {
            size: 'small',
            type: 'link',
            disabled: record.status === '已完成',
            onClick: () => openDispatchModal(record),
          },
          () => '派发',
        ),
        h(
          Button,
          {
            size: 'small',
            type: 'link',
            disabled: record.status === '已完成',
            onClick: () => openDisposeModal(record),
          },
          () => '处置',
        ),
      ]),
  },
];

function formatTime(t?: string) {
  if (!t) return '-';
  return t.replace('T', ' ').slice(0, 19);
}

async function loadEventList() {
  eventLoading.value = true;
  try {
    const [startTime, endTime] = searchForm.timeRange ?? [];
    const data = await getEventListApi({
      eventType: searchForm.eventType,
      location: searchForm.location || undefined,
      level: searchForm.level,
      status: searchForm.status,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      pageNo: eventPage.pageNo,
      pageSize: eventPage.pageSize,
    });
    eventRecords.value = (data?.records ?? []).map((r) => ({
      ...r,
      imageUrl: typeof r.imageUrl === 'string' ? r.imageUrl.replaceAll(/^`|`$/g, '') : r.imageUrl,
    }));
    eventTotal.value = data?.total ?? 0;
    selectedRowKeys.value = [];
  } catch (error: any) {
    message.error(error?.message ?? '加载失败');
  } finally {
    eventLoading.value = false;
  }
}

function handleEventSearch() {
  eventPage.pageNo = 1;
  loadEventList();
}

function resetEventSearch() {
  searchForm.eventType = undefined;
  searchForm.location = '';
  searchForm.level = undefined;
  searchForm.status = undefined;
  searchForm.timeRange = null;
  eventPage.pageNo = 1;
  loadEventList();
}

function handleTableChange(pagination: any) {
  eventPage.pageNo = pagination.current;
  eventPage.pageSize = pagination.pageSize;
  loadEventList();
}

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: number[]) => {
    selectedRowKeys.value = keys;
  },
}));
// endregion

// region 派发 & 处置弹窗
let DispatchForm: any, DispatchFormApi: any;
let DisposeForm: any, DisposeFormApi: any;

watch(
  () => staffList.value,
  async (options) => {
    if (options && options.length > 0) {
      [DispatchForm, DispatchFormApi] = useVaticForm({
        handleSubmit: (formData: Record<string, any>) => {
          message.loading({ content: '派发中...', duration: 0, key: 'is-form-submitting' });
          DispatchModalApi.lock();
          const { taskType, assignedTo } = formData;
          const data = {
            taskType,
            assignedTo,
            riskEventsEntityList: selectedEvents.value,
          };
          dispatchApi(data).then(() => {
            DispatchModalApi.close();
            loadEventList();
            message.success({ content: '派发成功', duration: 2, key: 'is-form-submitting' });
          });
        },
        schema: [
          {
            component: 'Textarea',
            fieldName: 'eventNameList',
            componentProps: { rows: 8 },
            label: '事件列表',
            labelWidth: 70,
            disabled: true,
          },
          {
            component: 'Switch',
            fieldName: 'taskType',
            label: '是否紧急',
            defaultValue: '普通',
            componentProps: {
              checkedChildren: '紧急',
              unCheckedChildren: '普通',
              checkedValue: '紧急',
              unCheckedValue: '普通',
            },
            labelWidth: 70,
          },
          {
            component: 'Select',
            componentProps: { options: staffList.value, class: 'w-full', placeholder: '请选择处理人' },
            fieldName: 'assignedTo',
            label: '处理人',
            labelWidth: 70,
            rules: 'required',
          },
        ],
        showDefaultActions: false,
      });

      [DisposeForm, DisposeFormApi] = useVaticForm({
        handleSubmit: (formData: Record<string, any>) => {
          message.loading({ content: '保存中...', duration: 0, key: 'is-form-submitting' });
          DisposeModalApi.lock();
          const { disposeMethod, pauseTo, remark } = formData;
          const data: any = {
            status: '未派发',
            remark: '',
            pauseTo: Date.now() - 10 * 60 * 1000,
            riskEventsEntityList: selectedEvents.value,
          };
          if (disposeMethod === '误报') {
            data.status = '已完成';
            data.remark = remark || '误报';
          } else {
            data.pauseTo = Date.now() + pauseTo * 60 * 1000;
          }
          disposeApi(data).then(() => {
            DisposeModalApi.close();
            loadEventList();
            message.success({ content: '保存成功', duration: 2, key: 'is-form-submitting' });
          });
        },
        schema: [
          {
            component: 'Textarea',
            fieldName: 'eventNameList',
            componentProps: { rows: 8 },
            label: '事件列表',
            labelWidth: 70,
            disabled: true,
          },
          {
            component: 'RadioGroup',
            componentProps: {
              name: 'disposeMethod',
              options: [
                { label: '误报', value: '误报' },
                { label: '暂停', value: '暂停' },
              ],
            },
            fieldName: 'disposeMethod',
            label: '处置方式',
            labelWidth: 70,
            rules: 'required',
          },
          {
            component: 'Input',
            fieldName: 'remark',
            label: '误报说明',
            labelWidth: 70,
            dependencies: {
              if: (formData: any) => formData.disposeMethod === '误报',
              triggerFields: ['disposeMethod'],
            },
          },
          {
            component: 'InputNumber',
            fieldName: 'pauseTo',
            label: '暂停时长',
            labelWidth: 70,
            rules: 'required',
            componentProps: { class: 'w-full', min: 1, step: 1, addonAfter: '分钟' },
            dependencies: {
              if: (formData: any) => formData.disposeMethod === '暂停',
              triggerFields: ['disposeMethod'],
            },
          },
        ],
        showDefaultActions: false,
      });
    }
  },
);

const [DispatchModal, DispatchModalApi] = useVaticModal({
  fullscreenButton: false,
  onCancel() {
    DispatchModalApi.close();
  },
  onConfirm: async () => {
    await DispatchFormApi.validateAndSubmitForm();
  },
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      const values = DispatchModalApi.getData<Record<string, any>>();
      if (values) DispatchFormApi.setValues(values);
    }
  },
  title: '派发',
});

const [DisposeModal, DisposeModalApi] = useVaticModal({
  fullscreenButton: false,
  onCancel() {
    DisposeModalApi.close();
  },
  onConfirm: async () => {
    await DisposeFormApi.validateAndSubmitForm();
  },
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      const values = DisposeModalApi.getData<Record<string, any>>();
      if (values) DisposeFormApi.setValues(values);
    }
  },
  title: '处置',
});

function openDispatchModal(row?: any) {
  const events = row
    ? [row].map((d) => ({
        eventType: d.eventType,
        location: d.location,
        latitude: d.latitude,
        longitude: d.longitude,
      }))
    : selectedEvents.value;
  if (events.length === 0) {
    message.warning('请先选择事件');
    return;
  }
  DispatchModalApi.setData({
    eventNameList: events.map((d) => `【${d.eventType}】${d.location}`).join('\n'),
  }).open();
}

function openDisposeModal(row?: any) {
  const events = row
    ? [row].map((d) => ({
        eventType: d.eventType,
        location: d.location,
        latitude: d.latitude,
        longitude: d.longitude,
      }))
    : selectedEvents.value;
  if (events.length === 0) {
    message.warning('请先选择事件');
    return;
  }
  DisposeModalApi.setData({
    eventNameList: events.map((d) => `【${d.eventType}】${d.location}`).join('\n'),
  }).open();
}
// endregion

onMounted(() => {
  loadEventList();
});
</script>

<template>
  <div class="p-5">
    <!-- 搜索栏 -->
    <div class="mb-4 flex flex-wrap items-center gap-3 rounded border border-gray-200 bg-white p-4">
      <span class="text-sm text-gray-600">事件类型：</span>
      <Select
        v-model:value="searchForm.eventType"
        allow-clear
        class="w-40"
        :options="eventTypeOptions"
        option-filter-prop="label"
        placeholder="全部类型"
        show-search
      />
      <span class="text-sm text-gray-600">事件位置：</span>
      <Input
        v-model:value="searchForm.location"
        allow-clear
        class="w-40"
        placeholder="请输入位置"
        @press-enter="handleEventSearch"
      />
      <span class="text-sm text-gray-600">级别：</span>
      <Select
        v-model:value="searchForm.level"
        allow-clear
        class="w-28"
        :options="levelOptions"
        placeholder="全部"
      />
      <span class="text-sm text-gray-600">状态：</span>
      <Select
        v-model:value="searchForm.status"
        allow-clear
        class="w-28"
        :options="statusOptions"
        placeholder="全部"
      />
      <span class="text-sm text-gray-600">时间：</span>
      <RangePicker
        v-model:value="searchForm.timeRange"
        show-time
        value-format="YYYY-MM-DD HH:mm:ss"
        :placeholder="['开始时间', '结束时间']"
      />
      <Button type="primary" @click="handleEventSearch">查询</Button>
      <Button @click="resetEventSearch">重置</Button>
    </div>

    <!-- 表格操作栏 -->
    <div class="mb-3 flex items-center justify-between">
      <span class="text-sm text-gray-500">
        共 {{ eventTotal }} 条，已选 {{ selectedRowKeys.length }} 项
      </span>
      <Space>
        <Button
          :disabled="selectedRowKeys.length === 0"
          @click="openDispatchModal()"
        >
          派发（{{ selectedRowKeys.length }}）
        </Button>
        <Button
          :disabled="selectedRowKeys.length === 0"
          @click="openDisposeModal()"
        >
          处置（{{ selectedRowKeys.length }}）
        </Button>
      </Space>
    </div>

    <!-- 事件表格 -->
    <Table
      :columns="eventColumns"
      :data-source="eventRecords"
      :loading="eventLoading"
      :pagination="{
        current: eventPage.pageNo,
        pageSize: eventPage.pageSize,
        total: eventTotal,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (t) => `共 ${t} 条`,
      }"
      :row-selection="rowSelection"
      row-key="id"
      scroll={{ x: 1200 }}
      size="middle"
      @change="handleTableChange"
    />

    <DispatchModal>
      <DispatchForm />
    </DispatchModal>
    <DisposeModal>
      <DisposeForm />
    </DisposeModal>
  </div>
</template>
