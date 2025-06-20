<script lang="ts" setup>
import type { VxeTableGridOptions } from '@vatic/plugins/vxe-table';

import { computed, h, onMounted, reactive, ref, watch } from 'vue';
import { useTippy } from 'vue-tippy';

import { ColPage, useVaticModal } from '@vatic/common-ui';
import { IconifyIcon } from '@vatic/icons';

import { Button, Card, Image, message, Popover, Tooltip } from 'ant-design-vue';

import { useVaticForm } from '#/adapter/form';
import { useVaticVxeGrid } from '#/adapter/vxe-table';
import {
  getEventListApi,
  getEventStatsApi,
  getStaffListApi,
  getStreetTreeApi,
} from '#/views/event/data';

const props = reactive({
  leftCollapsedWidth: 3,
  leftCollapsible: true,
  leftMaxWidth: 50,
  leftMinWidth: 12,
  leftWidth: 20,
  resizable: true,
  rightWidth: 80,
  splitHandle: true,
  splitLine: true,
});

const mapContainer = ref(null);
const mapIsLoaded = ref(false);

const eventStatInit = ref<boolean>(false);
const eventStatList = ref<any>([]);
const staffList = ref<any>([]);
const eventType = ref<any>([]);
getEventStatsApi().then((res) => {
  eventStatList.value = res.map((d: any) => {
    return { label: d.eventType, value: d.eventType };
  });
});
getStaffListApi().then((res) => {
  staffList.value = res.map((d: any) => {
    return { label: d.eventType, value: d.eventType };
  });
});

let map: any;

function loadHuaXi() {
  const boundary = new BMapGL.Boundary();
  boundary.get('花溪区', (rs: any) => {
    if (rs.boundaries.length === 0) {
      setTimeout(() => loadHuaXi(), 500);
    } else {
      for (let i = 0; i < rs.boundaries.length; i++) {
        const xyArr = rs.boundaries[i].split(';');
        const ptArr = [];

        for (const element of xyArr) {
          const tmp = element.split(',');
          const pt = new BMapGL.Point(tmp[0], tmp[1]);
          ptArr.push(pt);
        }

        const mapMask = new BMapGL.MapMask(ptArr, {
          isBuildingMask: true,
          isPoiMask: true,
          isMapMask: true,
          showRegion: 'inside',
          topFillColor: '#5679ea',
          topFillOpacity: 0.5,
          sideFillColor: '#5679ea',
          sideFillOpacity: 0.9,
        });

        map.addOverlay(mapMask);
        map.enableDragging();
        map.enableScrollWheelZoom();
      }
      mapIsLoaded.value = true;
    }
  });
}

function loadMap() {
  map = new BMapGL.Map(mapContainer.value, {
    enableMapClick: false,
    enableScrollWheelZoom: false,
    enableAutoResize: true,
  });
  map.disableDragging();
  map.centerAndZoom(
    new BMapGL.Point(106.623_548_548_890_23, 26.396_209_157_438_058),
    13,
  );

  document.querySelectorAll('.anchorBL').forEach((el) => el.remove());

  loadHuaXi();
}

function createCircleImage(src: string, isDevice: boolean) {
  const size = 45;
  const borderWidth = 5;
  const borderColor = isDevice ? '#DC143C' : '#4776E6';

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx: any = canvas.getContext('2d');
    const img = new window.Image();

    img.addEventListener('load', () => {
      canvas.width = size + borderWidth * 2;
      canvas.height = size + borderWidth * 2;

      ctx.beginPath();
      ctx.arc(
        size / 2 + borderWidth,
        size / 2 + borderWidth,
        size / 2,
        0,
        Math.PI * 2,
      );
      ctx.lineWidth = borderWidth;
      ctx.strokeStyle = borderColor;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(
        size / 2 + borderWidth,
        size / 2 + borderWidth,
        size / 2,
        0,
        Math.PI * 2,
      );
      ctx.closePath();
      ctx.clip();

      ctx.drawImage(img, borderWidth, borderWidth, size, size);

      resolve(canvas.toDataURL());
    });
    img.src = src;
  });
}

function createMarkers(events: any) {
  if (mapIsLoaded.value) {
    map.getOverlays().forEach((overlay: any) => {
      map.removeOverlay(overlay);
    });
    events.forEach((event: any) => {
      createCircleImage(event.imageUrl, !!event.sourceDeviceId).then((img) => {
        const point = new BMapGL.Point(event.latitude, event.longitude);
        const icon = new BMapGL.Icon(img, new BMapGL.Size(40, 40));

        const marker = new BMapGL.Marker(point, { icon, data: event });
        map.addOverlay(marker);

        setTimeout(() =>
          useTippy(marker.domElement, {
            content: h('div', [
              h('p', `事件类型：${event.eventType}`),
              h('p', `事件位置：${event.location}`),
              h('p', `首次发现时间：${event.captureTime}`),
              h('img', {
                src: event.imageUrl,
                style: 'margin-top: 10px',
              }),
            ]),
          }),
        );
      });
    });
  } else {
    setTimeout(() => createMarkers(events), 500);
  }
}

function transformTableData(resData: any) {
  function deleteLevel(data: any) {
    data.forEach((d: any) => {
      if (d.value === '5201') {
        resData.length = 0;
      } else if (d.parentId === '5201') {
        resData.push(d);
      }
      if (d.children) {
        deleteLevel(d.children);
      }
    });
  }

  deleteLevel(resData);
}

const [LocationGrid, LocationGridApi] = useVaticVxeGrid({
  gridEvents: {},
  gridOptions: {
    columns: [
      { align: 'left', title: '', type: 'checkbox', width: 30 },
      {
        align: 'left',
        field: 'title',
        title: '位置',
        treeNode: true,
      },
    ],
    height: 'auto',
    keepSource: true,
    pagerConfig: {
      enabled: false,
    },
    checkboxConfig: {
      checkStrictly: false,
      visibleMethod: ({ row }) => row.value.length > 8,
    },
    proxyConfig: {
      ajax: {
        query: async (_params) => {
          const resData = await getStreetTreeApi();
          transformTableData(resData);
          return resData;
        },
      },
    },
    treeConfig: {},
  } as VxeTableGridOptions,
});

const [TaskGrid, TaskGridApi] = useVaticVxeGrid({
  gridEvents: {},
  gridOptions: {
    columns: [
      { align: 'left', title: '', type: 'checkbox', width: 30 },
      {
        field: 'imageUrl',
        slots: { default: 'image-url' },
        title: '图片',
        width: 80,
      },
      {
        align: 'left',
        field: 'name',
        slots: { default: 'risk-info' },
        title: '详情',
      },
    ],
    height: 'auto',
    keepSource: true,
    showOverflow: false,
    pagerConfig: {
      pageSize: 1,
      pagerCount: 5,
      layouts: ['PrevPage', 'NextPage', 'Jump', 'PageCount', 'Total'],
    },
    proxyConfig: {
      ajax: {
        query: async () => {
          const formValues = await TypeFormApi?.getValues();
          const params = {
            eventTypes: formValues?.eventType,
            locations: LocationGridApi?.grid
              .getCheckboxRecords()
              .filter((d: any) => d.value.length > 8)
              .map((d: any) => d.title),
          };
          const res = await getEventListApi(params);
          createMarkers(res.records);
          return res;
        },
      },
    },
  } as VxeTableGridOptions,
});

let TypeForm: any, TypeFormApi: any;

watch(
  () => eventStatList.value,
  async (options) => {
    if (options && options.length > 0) {
      [TypeForm, TypeFormApi] = useVaticForm({
        commonConfig: {
          hideLabel: true,
          componentProps: {
            class: 'w-full',
          },
        },
        showDefaultActions: false,
        handleValuesChange(values) {
          eventType.value = values.eventType;
        },
        handleSubmit(values) {
          console.warn(values);
        },
        schema: [
          {
            component: 'CheckboxGroup',
            componentProps: {
              name: 'eventType',
              options,
            },
            fieldName: 'eventType',
          },
        ],
      });
      eventStatInit.value = true;
    }
  },
);

let DispatchForm: any, DispatchFormApi: any;

const selectEvents = computed(() =>
  TaskGridApi.grid
    .getCheckboxRecords()
    .map((d) => `【${d.eventType}】${d.location}`),
);

watch(
  () => eventStatList.value,
  async (options) => {
    if (options && options.length > 0) {
      [DispatchForm, DispatchFormApi] = useVaticForm({
        handleSubmit: (_: Record<string, any>) => {
          message.loading({
            content: '派发中...',
            duration: 0,
            key: 'is-form-submitting',
          });
          ModalApi.lock();
          setTimeout(() => {
            ModalApi.close();
            message.success({
              content: `派发成功`,
              duration: 2,
              key: 'is-form-submitting',
            });
          }, 2000);
        },
        schema: [
          {
            component: 'Textarea',
            fieldName: 'eventNameList',
            componentProps: {
              rows: 10,
            },
            label: '事件列表',
            labelWidth: 60,
            disabled: true,
          },
          {
            component: 'Switch',
            fieldName: 'taskType',
            label: '是否紧急',
            componentProps: {
              checkedChildren: '紧急',
              unCheckedChildren: '普通',
              checkedValue: '紧急',
              unCheckedValue: '普通',
            },
            labelWidth: 60,
          },
          {
            component: 'Select',
            componentProps: {
              options: staffList.value,
              class: 'w-full',
              placeholder: '请选择处理人',
            },
            fieldName: 'field3',
            label: '处理人',
            labelWidth: 60,
            rules: 'required',
          },
        ],
        showDefaultActions: false,
      });
    }
  },
);

const expandAll = () => {
  LocationGridApi.grid?.setAllTreeExpand(true);
};

const collapseAll = () => {
  LocationGridApi.grid?.setAllTreeExpand(false);
};

const [Modal, ModalApi] = useVaticModal({
  fullscreenButton: false,
  onCancel() {
    ModalApi.close();
  },
  onConfirm: async () => {
    await DispatchFormApi.validateAndSubmitForm();
  },
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      const values = ModalApi.getData<Record<string, any>>();
      if (values) {
        DispatchFormApi.setValues(values);
      }
    }
  },
  title: `派发`,
});

function appendToDisposeList(row: any = '', toggle: boolean = false) {
  if (typeof TaskGridApi.grid.getCheckboxRecords === 'function') {
    const checkedRecords = TaskGridApi.grid.getCheckboxRecords();

    if (row) {
      const risk = TaskGridApi.grid
        .getCheckboxRecords()
        .find((item) => item.id === row.id);
      if (toggle) {
        TaskGridApi.grid.setCheckboxRow(row, !risk);
      } else {
        return !!risk;
      }
    } else {
      return checkedRecords.length;
    }
  }
}

onMounted(() => {
  loadMap();
});
</script>
<template>
  <div class="h-full w-full" style="min-width: 1700px">
    <div ref="mapContainer" class="h-full w-full"></div>
    <div class="absolute top-0 flex h-full w-full justify-between">
      <ColPage auto-content-height v-bind="props">
        <template #left="{ isCollapsed, expand }">
          <div v-if="isCollapsed" @click="expand">
            <Tooltip title="点击展开左侧">
              <Button class="z-50" shape="circle" type="primary">
                <template #icon>
                  <IconifyIcon class="text-2xl" icon="bi:arrow-right" />
                </template>
              </Button>
            </Tooltip>
          </div>
          <div v-else :style="{ minWidth: '200px' }" class="z-50 h-full">
            <Card
              :body-style="{ height: '100%', padding: '12px' }"
              class="z-50 h-full"
            >
              <TypeForm class="mb-3 h-1/6 overflow-auto" v-if="eventStatInit" />
              <Button
                type="primary"
                @click="TaskGridApi.grid.commitProxy('query')"
                class="position-absolute z-50 w-full"
              >
                查询
              </Button>
              <LocationGrid class="h-5/6">
                <template #toolbar-tools>
                  <Button
                    class="mr-2"
                    size="small"
                    type="link"
                    @click="expandAll"
                  >
                    展开
                  </Button>
                  <Button size="small" type="link" @click="collapseAll">
                    折叠
                  </Button>
                </template>
              </LocationGrid>
            </Card>
          </div>
        </template>
        <div class="ml-2 h-full">
          <Card
            :body-style="{ height: '100%', padding: 0 }"
            class="z-50 float-right h-full w-1/4"
          >
            <TaskGrid>
              <template #toolbar-tools>
                <Button
                  size="small"
                  type="link"
                  @click="
                    ModalApi.setData({
                      eventNameList: selectEvents.join('\n'),
                    }).open()
                  "
                >
                  派发（{{ appendToDisposeList() }}）
                </Button>
              </template>
              <template #image-url="{ row }">
                <Image :src="row.imageUrl" height="80" width="80" />
              </template>
              <template #risk-info="{ row }">
                <Popover placement="left">
                  <template #content>
                    <p>事件类型：{{ row.eventType }}</p>
                    <p>事件位置：{{ row.location }}</p>
                    <p>首次发现时间：{{ row.captureTime }}</p>
                    <div class="popover-image">
                      <Popover placement="left">
                        <template #content>
                          <Image :src="row.imageUrl" :preview="false" />
                        </template>
                        <div style="width: 30%">
                          <Image :src="row.imageUrl" :preview="false" />
                        </div>
                      </Popover>
                      <Popover placement="left">
                        <template #content>
                          <Image :src="row.imageUrl" :preview="false" />
                        </template>
                        <div style="width: 30%">
                          <Image :src="row.imageUrl" :preview="false" />
                        </div>
                      </Popover>
                      <Popover placement="left">
                        <template #content>
                          <Image :src="row.imageUrl" :preview="false" />
                        </template>
                        <div style="width: 30%">
                          <Image :src="row.imageUrl" :preview="false" />
                        </div>
                      </Popover>
                      <Popover placement="left">
                        <template #content>
                          <Image :src="row.imageUrl" :preview="false" />
                        </template>
                        <div style="width: 30%">
                          <Image :src="row.imageUrl" :preview="false" />
                        </div>
                      </Popover>
                      <Popover placement="left">
                        <template #content>
                          <Image :src="row.imageUrl" :preview="false" />
                        </template>
                        <div style="width: 30%">
                          <Image :src="row.imageUrl" :preview="false" />
                        </div>
                      </Popover>
                      <Popover placement="left">
                        <template #content>
                          <Image :src="row.imageUrl" :preview="false" />
                        </template>
                        <div style="width: 30%">
                          <Image :src="row.imageUrl" :preview="false" />
                        </div>
                      </Popover>
                      <Popover placement="left">
                        <template #content>
                          <Image :src="row.imageUrl" :preview="false" />
                        </template>
                        <div style="width: 30%">
                          <Image :src="row.imageUrl" :preview="false" />
                        </div>
                      </Popover>
                      <Popover placement="left">
                        <template #content>
                          <Image :src="row.imageUrl" :preview="false" />
                        </template>
                        <div style="width: 30%">
                          <Image :src="row.imageUrl" :preview="false" />
                        </div>
                      </Popover>
                      <Popover placement="left">
                        <template #content>
                          <Image :src="row.imageUrl" :preview="false" />
                        </template>
                        <div style="width: 30%">
                          <Image :src="row.imageUrl" :preview="false" />
                        </div>
                      </Popover>
                    </div>
                  </template>
                  <Tooltip
                    :title="
                      appendToDisposeList(row)
                        ? '点击【移出】待派发列表'
                        : '点击【加入】待派发列表'
                    "
                    :color="appendToDisposeList(row) ? 'red' : 'blue'"
                  >
                    <a
                      style="color: #006be6"
                      @click="appendToDisposeList(row, true)"
                    >
                      {{ row.eventType }}
                    </a>
                  </Tooltip>
                </Popover>
                <h6>{{ row.location }}</h6>
                <h6>{{ row.captureTime }}</h6>
              </template>
            </TaskGrid>
          </Card>
        </div>
      </ColPage>
    </div>
    <Modal>
      <DispatchForm />
    </Modal>
  </div>
</template>
<style lang="scss" scoped>
::v-deep .vxe-table--body-wrapper {
  z-index: 999;
}

::v-deep .vxe-grid {
  padding: 0;

  .vxe-pager {
    margin-top: 0;
  }

  .vxe-table--header-wrapper {
    background-color: transparent;
  }

  .vxe-toolbar {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 10;
    height: 38px;
  }
}

.popover-image {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  width: 500px;
  max-height: calc(100vh - 250px);
  margin-top: 10px;
  overflow: auto;
}
</style>
