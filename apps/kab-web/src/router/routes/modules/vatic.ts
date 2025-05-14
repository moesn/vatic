import type { RouteRecordRaw } from 'vue-router';

import {
  VATIC_ANT_PREVIEW_URL,
  VATIC_DOC_URL,
  VATIC_ELE_PREVIEW_URL,
  VATIC_GITHUB_URL,
  VATIC_LOGO_URL,
  VATIC_NAIVE_PREVIEW_URL,
} from '@vatic/constants';
import { SvgAntdvLogoIcon } from '@vatic/icons';

import { IFrameView } from '#/layouts';
import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      badgeType: 'dot',
      icon: VATIC_LOGO_URL,
      order: 9998,
      title: $t('demos.vatic.title'),
    },
    name: 'VaticProject',
    path: '/vatic-admin',
    children: [
      {
        name: 'VaticDocument',
        path: '/vatic-admin/document',
        component: IFrameView,
        meta: {
          icon: 'lucide:book-open-text',
          link: VATIC_DOC_URL,
          title: $t('demos.vatic.document'),
        },
      },
      {
        name: 'VaticGithub',
        path: '/vatic-admin/github',
        component: IFrameView,
        meta: {
          icon: 'mdi:github',
          link: VATIC_GITHUB_URL,
          title: 'Github',
        },
      },
      {
        name: 'VaticAntdv',
        path: '/vatic-admin/antdv',
        component: IFrameView,
        meta: {
          badgeType: 'dot',
          icon: SvgAntdvLogoIcon,
          link: VATIC_ANT_PREVIEW_URL,
          title: $t('demos.vatic.antdv'),
        },
      },
      {
        name: 'VaticNaive',
        path: '/vatic-admin/naive',
        component: IFrameView,
        meta: {
          badgeType: 'dot',
          icon: 'logos:naiveui',
          link: VATIC_NAIVE_PREVIEW_URL,
          title: $t('demos.vatic.naive-ui'),
        },
      },
      {
        name: 'VaticElementPlus',
        path: '/vatic-admin/ele',
        component: IFrameView,
        meta: {
          badgeType: 'dot',
          icon: 'logos:element',
          link: VATIC_ELE_PREVIEW_URL,
          title: $t('demos.vatic.element-plus'),
        },
      },
    ],
  },
  {
    component: () => import('#/views/_core/about/index.vue'),
    meta: {
      icon: 'lucide:copyright',
      order: 9999,
      title: $t('demos.vatic.about'),
    },
    name: 'VaticAbout',
    path: '/vatic-admin/about',
  },
];

export default routes;
