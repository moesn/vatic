<script lang="ts" setup>
import type { TabOption } from '@vatic/types';

import { onMounted } from 'vue';

import {
  AnalysisChartCard,
  AnalysisChartsTabs,
  useVaticModal,
} from '@vatic/common-ui';
import { MapPin, Plus, SquarePen, Trash2 } from '@vatic/icons';

import { Button, message } from 'ant-design-vue';

import { useVaticForm } from '#/adapter/form';

const chartTabs: TabOption[] = [
  {
    label: '在线（9）',
    value: 'online',
  },
  {
    label: '离线（0）',
    value: 'offline',
  },
];

const chunkArray = (array: object[], size: number) => {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    const chunk = array.slice(i, i + size);
    result.push(chunk);
  }
  return result;
};

const videos: any[] = chunkArray(
  [
    {
      name: '安全生产运营平台-消控室',
      location: '这里是视频设备位置',
    },
    {
      name: '消控室',
      location: '保安室',
    },
    {
      name: '消控室',
      location: '保安室',
    },
    {
      name: '消控室',
      location: '保安室',
    },
    {
      name: '消控室',
      location: '保安室',
    },
    {
      name: '消控室',
      location: '保安室',
    },
    {
      name: '消控室',
      location: '保安室',
    },
    {
      name: '消控室',
      location: '保安室',
    },
    {
      name: '消控室',
      location: '保安室',
    },
  ],
  3,
);

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
      if (values) {
        DisposeFormApi.setValues(values);
      }
    }
  },
  title: `添加视频流（TODO）`,
});

const [DisposeForm, DisposeFormApi] = useVaticForm({
  handleSubmit: (formData: Record<string, any>) => {
    message.loading({
      content: '保存中...',
      duration: 0,
      key: 'is-form-submitting',
    });
    DisposeModalApi.lock();
    const { disposeMethod, pauseTo, remark } = formData;
    const data = {
      status: '未派发',
      remark: '',
      pauseTo: Date.now() - 10 * 60 * 1000,
    };

    if (disposeMethod === '误报') {
      data.status = '已完成';
      data.remark = remark || '误报';
    } else {
      data.pauseTo = Date.now() + pauseTo * 60 * 1000;
    }

    // disposeApi(data).then((_) => {
    //   DisposeModalApi.close();
    //   TaskGridApi.grid.commitProxy('query');
    //   message.success({
    //     content: `保存成功`,
    //     duration: 2,
    //     key: 'is-form-submitting',
    //   });
    // });
  },
  schema: [
    {
      component: 'Input',
      fieldName: 'todo',
      label: '摄像头点位',
      labelWidth: 80,
      rules: 'required',
    },
    {
      component: 'Textarea',
      fieldName: 'eventNameList',
      componentProps: {
        rows: 5,
      },
      label: '视频流地址',
      labelWidth: 80,
      rules: 'required',
    },
  ],
  showDefaultActions: false,
});

onMounted(() => {
  if (flvjs.isSupported()) {
    const videoElements = document.querySelectorAll('.videoElement');
    videoElements?.forEach((videoElement: any, index: number) => {
      const player = flvjs.createPlayer(
        {
          type: 'flv',
          isLive: false,
          url: `${(index % 4) + 1}.flv`,
        },
        {
          lazyLoadMaxDuration: 10 * 60,
          stashInitialSize: 128,
        },
      );
      player.attachMediaElement(videoElement);
      player.load();
      player.pause();
      player.play();
    });
  }
});
</script>

<template>
  <div class="p-5">
    <Button
      type="primary"
      class="absolute right-10 top-14"
      @click="DisposeModalApi.setData({}).open()"
    >
      <Plus class="size-5" />
      添加视频流
    </Button>
    <AnalysisChartsTabs :tabs="chartTabs" class="mt-5">
      <template #online>
        <div
          v-for="(videoGroup, i) in videos"
          class="mt-5 w-full md:flex"
          :key="i"
        >
          <AnalysisChartCard
            v-for="(video, idx) in videoGroup"
            :key="video.name"
            class="mt-5 md:mt-0 md:w-1/3"
            :class="{ 'md:mr-4': (idx + 1) % 3 }"
            :title="video.name"
          >
            <div class="float-right -mt-10 flex w-14 justify-between">
              <SquarePen class="size-5" />
              <Trash2 class="size-5" />
            </div>
            <div class="mb-1 flex">
              <MapPin class="size-4" />
              <p class="-mt-1">{{ video.location }}</p>
            </div>
            <video class="videoElement" autoplay muted></video>
          </AnalysisChartCard>
        </div>
      </template>
      <template #offline>
        <VideoItem />
      </template>
    </AnalysisChartsTabs>
    <DisposeModal>
      <DisposeForm />
    </DisposeModal>
  </div>
</template>
