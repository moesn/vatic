<script lang="ts" setup>
import type { NotificationItem } from '@vatic/layouts';

import { computed, onBeforeMount, ref, watch } from 'vue';

import { AuthenticationLoginExpiredModal } from '@vatic/common-ui';
import { useWatermark } from '@vatic/hooks';
import { CircleHelp } from '@vatic/icons';
import {
  BasicLayout,
  LockScreen,
  Notification,
  UserDropdown,
} from '@vatic/layouts';
import { preferences } from '@vatic/preferences';
import { useAccessStore, useTabbarStore, useUserStore } from '@vatic/stores';

import { message } from 'ant-design-vue';

import { requestClient } from '#/api/request';
import { $t } from '#/locales';
import { useAuthStore } from '#/store';
import LoginForm from '#/views/_core/authentication/login.vue';

const { setMenuList } = useTabbarStore();
setMenuList([
  'close',
  'affix',
  'maximize',
  'reload',
  'open-in-new-window',
  'close-left',
  'close-right',
  'close-other',
  'close-all',
]);

const notifications = ref<NotificationItem[]>([]);

const userStore = useUserStore();
const authStore = useAuthStore();
const accessStore = useAccessStore();
const { destroyWatermark, updateWatermark } = useWatermark();
const showDot = computed(() =>
  notifications.value.some((item) => !item.isRead),
);

const menus = computed(() => [
  {
    handler: () => {},
    icon: CircleHelp,
    text: $t('ui.widgets.qa'),
  },
]);

const avatar = computed(() => {
  return userStore.userInfo?.avatarUrl ?? preferences.app.defaultAvatar;
});

async function handleLogout() {
  await authStore.logout(false);
}

/** 修改密码：由布局层转发，接口调用与提示在应用层完成 */
async function handleChangePassword(payload: {
  newPassword: string;
  oldPassword: string;
}) {
  try {
    await requestClient.patch('/api/user/changePassword', {
      id: Number(userStore.userInfo?.userId),
      newPassword: payload.newPassword,
      oldPassword: payload.oldPassword,
    });
    message.success('密码修改成功');
  } catch {
    message.error('密码修改失败');
  }
}

function handleNoticeClear() {
  notifications.value = [];
}

function handleMakeAll() {
  notifications.value.forEach((item) => (item.isRead = true));
}

function handleClickLogo() {}

watch(
  () => preferences.app.watermark,
  async (enable) => {
    if (enable) {
      await updateWatermark({
        content: `${userStore.userInfo?.account} - ${userStore.userInfo?.username}`,
      });
    } else {
      destroyWatermark();
    }
  },
  {
    immediate: true,
  },
);

onBeforeMount(() => {
  if (preferences.app.watermark) {
    destroyWatermark();
  }
});
</script>

<template>
  <BasicLayout
    @clear-preferences-and-logout="handleLogout"
    @click-logo="handleClickLogo"
  >
    <template #user-dropdown>
      <UserDropdown
        :avatar
        :menus
        :text="userStore.userInfo?.username"
        :description="userStore.userInfo?.phone"
        :tag-text="userStore.userInfo?.account"
        trigger="both"
        @change-password="handleChangePassword"
        @logout="handleLogout"
      />
    </template>
    <template #notification>
      <Notification
        :dot="showDot"
        :notifications="notifications"
        @clear="handleNoticeClear"
        @make-all="handleMakeAll"
      />
    </template>
    <template #extra>
      <AuthenticationLoginExpiredModal
        v-model:open="accessStore.loginExpired"
        :avatar
      >
        <LoginForm />
      </AuthenticationLoginExpiredModal>
    </template>
    <template #lock-screen>
      <LockScreen :avatar @to-login="handleLogout" />
    </template>
  </BasicLayout>
</template>
