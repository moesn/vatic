<script lang="ts" setup>
import type { SetupContext } from 'vue';

import type { MenuRecordRaw } from '@vatic/types';

import { computed, useSlots, watch } from 'vue';

import { useRefresh } from '@vatic/hooks';
import { $t, i18n } from '@vatic/locales';
import {
  preferences,
  updatePreferences,
  usePreferences,
} from '@vatic/preferences';
import { useAccessStore } from '@vatic/stores';
import { cloneDeep, mapTree } from '@vatic/utils';

import { VaticAdminLayout } from '@vatic-core/layout-ui';
import { VaticBackTop, VaticLogo } from '@vatic-core/shadcn-ui';

import { Breadcrumb, CheckUpdates, Preferences } from '../widgets';
import { LayoutContent, LayoutContentSpinner } from './content';
import { Copyright } from './copyright';
import { LayoutFooter } from './footer';
import { LayoutHeader } from './header';
import {
  LayoutExtraMenu,
  LayoutMenu,
  LayoutMixedMenu,
  useExtraMenu,
  useMixedMenu,
} from './menu';
import { LayoutTabbar } from './tabbar';

defineOptions({ name: 'BasicLayout' });

const emit = defineEmits<{ clearPreferencesAndLogout: []; clickLogo: [] }>();

const {
  isDark,
  isHeaderNav,
  isMixedNav,
  isMobile,
  isSideMixedNav,
  isHeaderMixedNav,
  isHeaderSidebarNav,
  layout,
  preferencesButtonPosition,
  sidebarCollapsed,
  theme,
} = usePreferences();
const accessStore = useAccessStore();
const { refresh } = useRefresh();

const sidebarTheme = computed(() => {
  const dark = isDark.value || preferences.theme.semiDarkSidebar;
  return dark ? 'dark' : 'light';
});

const headerTheme = computed(() => {
  const dark = isDark.value || preferences.theme.semiDarkHeader;
  return dark ? 'dark' : 'light';
});

const logoClass = computed(() => {
  const { collapsedShowTitle } = preferences.sidebar;
  const classes: string[] = [];

  if (collapsedShowTitle && sidebarCollapsed.value && !isMixedNav.value) {
    classes.push('mx-auto');
  }

  if (isSideMixedNav.value) {
    classes.push('flex-center');
  }

  return classes.join(' ');
});

const isMenuRounded = computed(() => {
  return preferences.navigation.styleType === 'rounded';
});

const logoCollapsed = computed(() => {
  if (isMobile.value && sidebarCollapsed.value) {
    return true;
  }
  if (isHeaderNav.value || isMixedNav.value || isHeaderSidebarNav.value) {
    return false;
  }
  return (
    sidebarCollapsed.value || isSideMixedNav.value || isHeaderMixedNav.value
  );
});

const showHeaderNav = computed(() => {
  return (
    !isMobile.value &&
    (isHeaderNav.value || isMixedNav.value || isHeaderMixedNav.value)
  );
});

const {
  handleMenuSelect,
  handleMenuOpen,
  headerActive,
  headerMenus,
  sidebarActive,
  sidebarMenus,
  mixHeaderMenus,
  sidebarVisible,
} = useMixedMenu();

// 侧边多列菜单
const {
  extraActiveMenu,
  extraMenus,
  handleDefaultSelect,
  handleMenuMouseEnter,
  handleMixedMenuSelect,
  handleSideMouseLeave,
  sidebarExtraVisible,
} = useExtraMenu(mixHeaderMenus);

/**
 * 包装菜单，翻译菜单名称
 * @param menus 原始菜单数据
 * @param deep 是否深度包装。对于双列布局，只需要包装第一层，因为更深层的数据会在扩展菜单中重新包装
 */
function wrapperMenus(menus: MenuRecordRaw[], deep: boolean = true) {
  return deep
    ? mapTree(menus, (item) => {
        return { ...cloneDeep(item), name: $t(item.name) };
      })
    : menus.map((item) => {
        return { ...cloneDeep(item), name: $t(item.name) };
      });
}

function toggleSidebar() {
  updatePreferences({
    sidebar: {
      hidden: !preferences.sidebar.hidden,
    },
  });
}

function clearPreferencesAndLogout() {
  emit('clearPreferencesAndLogout');
}

function clickLogo() {
  emit('clickLogo');
}

watch(
  () => preferences.app.layout,
  async (val) => {
    if (val === 'sidebar-mixed-nav' && preferences.sidebar.hidden) {
      updatePreferences({
        sidebar: {
          hidden: false,
        },
      });
    }
  },
);

// 语言更新后，刷新页面
// i18n.global.locale会在preference.app.locale变更之后才会更新，因此watchpreference.app.locale是不合适的，刷新页面时可能语言配置尚未完全加载完成
watch(i18n.global.locale, refresh, { flush: 'post' });

const slots: SetupContext['slots'] = useSlots();
const headerSlots = computed(() => {
  return Object.keys(slots).filter((key) => key.startsWith('header-'));
});
</script>

<template>
  <VaticAdminLayout
    v-model:sidebar-extra-visible="sidebarExtraVisible"
    :content-compact="preferences.app.contentCompact"
    :footer-enable="preferences.footer.enable"
    :footer-fixed="preferences.footer.fixed"
    :header-hidden="preferences.header.hidden"
    :header-mode="preferences.header.mode"
    :header-theme="headerTheme"
    :header-toggle-sidebar-button="preferences.widget.sidebarToggle"
    :header-visible="preferences.header.enable"
    :is-mobile="preferences.app.isMobile"
    :layout="layout"
    :sidebar-collapse="preferences.sidebar.collapsed"
    :sidebar-collapse-show-title="preferences.sidebar.collapsedShowTitle"
    :sidebar-enable="sidebarVisible"
    :sidebar-collapsed-button="preferences.sidebar.collapsedButton"
    :sidebar-fixed-button="preferences.sidebar.fixedButton"
    :sidebar-expand-on-hover="preferences.sidebar.expandOnHover"
    :sidebar-extra-collapse="preferences.sidebar.extraCollapse"
    :sidebar-hidden="preferences.sidebar.hidden"
    :sidebar-theme="sidebarTheme"
    :sidebar-width="preferences.sidebar.width"
    :tabbar-enable="preferences.tabbar.enable"
    :tabbar-height="preferences.tabbar.height"
    @side-mouse-leave="handleSideMouseLeave"
    @toggle-sidebar="toggleSidebar"
    @update:sidebar-collapse="
      (value: boolean) => updatePreferences({ sidebar: { collapsed: value } })
    "
    @update:sidebar-enable="
      (value: boolean) => updatePreferences({ sidebar: { enable: value } })
    "
    @update:sidebar-expand-on-hover="
      (value: boolean) =>
        updatePreferences({ sidebar: { expandOnHover: value } })
    "
    @update:sidebar-extra-collapse="
      (value: boolean) =>
        updatePreferences({ sidebar: { extraCollapse: value } })
    "
  >
    <!-- logo -->
    <template #logo>
      <VaticLogo
        v-if="preferences.logo.enable"
        :class="logoClass"
        :collapsed="logoCollapsed"
        :src="preferences.logo.source"
        :text="preferences.app.name"
        :theme="showHeaderNav ? headerTheme : theme"
        @click="clickLogo"
      >
        <template v-if="$slots['logo-text']" #text>
          <slot name="logo-text"></slot>
        </template>
      </VaticLogo>
    </template>
    <!-- 头部区域 -->
    <template #header>
      <LayoutHeader
        :theme="theme"
        @clear-preferences-and-logout="clearPreferencesAndLogout"
      >
        <template
          v-if="!showHeaderNav && preferences.breadcrumb.enable"
          #breadcrumb
        >
          <Breadcrumb
            :hide-when-only-one="preferences.breadcrumb.hideOnlyOne"
            :show-home="preferences.breadcrumb.showHome"
            :show-icon="preferences.breadcrumb.showIcon"
            :type="preferences.breadcrumb.styleType"
          />
        </template>
        <template v-if="showHeaderNav" #menu>
          <LayoutMenu
            :default-active="headerActive"
            :menus="wrapperMenus(headerMenus)"
            :rounded="isMenuRounded"
            :theme="headerTheme"
            class="w-full"
            mode="horizontal"
            @select="handleMenuSelect"
          />
        </template>
        <template #user-dropdown>
          <slot name="user-dropdown"></slot>
        </template>
        <template #notification>
          <slot name="notification"></slot>
        </template>
        <template v-for="item in headerSlots" #[item]>
          <slot :name="item"></slot>
        </template>
      </LayoutHeader>
    </template>
    <!-- 侧边菜单区域 -->
    <template #menu>
      <LayoutMenu
        :accordion="preferences.navigation.accordion"
        :collapse="preferences.sidebar.collapsed"
        :collapse-show-title="preferences.sidebar.collapsedShowTitle"
        :default-active="sidebarActive"
        :menus="wrapperMenus(sidebarMenus)"
        :rounded="isMenuRounded"
        :theme="sidebarTheme"
        mode="vertical"
        @open="handleMenuOpen"
        @select="handleMenuSelect"
      />
    </template>
    <template #mixed-menu>
      <LayoutMixedMenu
        :active-path="extraActiveMenu"
        :menus="wrapperMenus(mixHeaderMenus, false)"
        :rounded="isMenuRounded"
        :theme="sidebarTheme"
        @default-select="handleDefaultSelect"
        @enter="handleMenuMouseEnter"
        @select="handleMixedMenuSelect"
      />
    </template>
    <!-- 侧边额外区域 -->
    <template #side-extra>
      <LayoutExtraMenu
        :accordion="preferences.navigation.accordion"
        :collapse="preferences.sidebar.extraCollapse"
        :menus="wrapperMenus(extraMenus)"
        :rounded="isMenuRounded"
        :theme="sidebarTheme"
      />
    </template>
    <template #side-extra-title>
      <VaticLogo
        v-if="preferences.logo.enable"
        :text="preferences.app.name"
        :theme="theme"
      >
        <template v-if="$slots['logo-text']" #text>
          <slot name="logo-text"></slot>
        </template>
      </VaticLogo>
    </template>

    <template #tabbar>
      <LayoutTabbar
        v-if="preferences.tabbar.enable"
        :show-icon="preferences.tabbar.showIcon"
        :theme="theme"
      />
    </template>

    <!-- 主体内容 -->
    <template #content>
      <LayoutContent />
    </template>

    <template v-if="preferences.transition.loading" #content-overlay>
      <LayoutContentSpinner />
    </template>

    <!-- 页脚 -->
    <template v-if="preferences.footer.enable" #footer>
      <LayoutFooter>
        <Copyright
          v-if="preferences.copyright.enable"
          v-bind="preferences.copyright"
        />
      </LayoutFooter>
    </template>

    <template #extra>
      <slot name="extra"></slot>
      <CheckUpdates
        v-if="preferences.app.enableCheckUpdates"
        :check-updates-interval="preferences.app.checkUpdatesInterval"
      />

      <Transition v-if="preferences.widget.lockScreen" name="slide-up">
        <slot v-if="accessStore.isLockScreen" name="lock-screen"></slot>
      </Transition>

      <template v-if="preferencesButtonPosition.fixed">
        <Preferences
          class="z-100 fixed bottom-20 right-0"
          @clear-preferences-and-logout="clearPreferencesAndLogout"
        />
      </template>
      <VaticBackTop />
    </template>
  </VaticAdminLayout>
</template>
