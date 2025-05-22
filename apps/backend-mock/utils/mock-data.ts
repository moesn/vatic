export interface UserInfo {
  id: number;
  password: string;
  realName: string;
  roles: string[];
  username: string;
  homePath?: string;
}

export const MOCK_USERS: UserInfo[] = [
  {
    id: 0,
    password: '123456',
    realName: 'Vatic',
    roles: ['super'],
    username: 'vatic',
  },
  {
    id: 1,
    password: 'Ad.123~',
    realName: 'Admin',
    roles: ['admin'],
    username: 'admin',
    homePath: '/dashboard',
  },
  {
    id: 2,
    password: '123456',
    realName: 'Jack',
    roles: ['user'],
    username: 'jack',
    homePath: '/analytics',
  },
];

export const MOCK_CODES = [
  // super
  {
    codes: ['AC_100100', 'AC_100110', 'AC_100120', 'AC_100010'],
    username: 'vatic',
  },
  {
    // admin
    codes: ['AC_100010', 'AC_100020', 'AC_100030'],
    username: 'admin',
  },
  {
    // user
    codes: ['AC_1000001', 'AC_1000002'],
    username: 'jack',
  },
];

const dashboardMenus = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    component: '/dashboard/index',
    meta: {
      affixTab: true,
      keepAlive: true,
      title: '首页',
      icon: 'mdi:monitor-dashboard',
    },
  },
  {
    name: 'Task',
    path: '/task',
    component: '/smart/index',
    meta: {
      keepAlive: true,
      title: '任务管理',
      icon: 'mdi:calendar-task-outline',
    },
  },
  {
    name: 'RealTimeRiskEvent',
    path: '/realtime',
    component: '/smart/index',
    meta: {
      keepAlive: true,
      title: '实时风险事件',
      icon: 'mdi:progress-warning',
    },
  },
  {
    name: 'HistoryRiskEvent',
    path: '/history',
    component: '/smart/index',
    meta: {
      keepAlive: true,
      title: '历史风险事件',
      icon: 'mdi:clipboard-text-history-outline',
    },
  },
  {
    name: 'Maintain',
    path: '/maintain',
    meta: {
      title: '养护管理',
      icon: 'mdi:car-repair',
    },
    children: [
      {
        name: 'MaintainRecord',
        path: '/maintain/record',
        component: '/smart/index',
        meta: {
          keepAlive: true,
          title: '养护记录管理',
        },
      },
      {
        name: 'MaintainTrack',
        path: '/maintain/track',
        component: '/smart/index',
        meta: {
          keepAlive: true,
          title: '养护轨迹查看',
        },
      },
    ],
  },
  {
    name: 'Resource',
    path: '/resource',
    meta: {
      title: '信息录入',
      icon: 'mdi:car-info',
    },
    children: [
      {
        name: 'ResourceCompany',
        path: '/resource/company',
        component: '/smart/index',
        meta: {
          keepAlive: true,
          title: '养护企业管理',
        },
      },
      {
        name: 'ResourceCar',
        path: '/resource/car',
        component: '/smart/index',
        meta: {
          keepAlive: true,
          title: '养护车辆管理',
        },
      },
      {
        name: 'ResourceStaff',
        path: '/resource/staff',
        component: '/smart/index',
        meta: {
          keepAlive: true,
          title: '养护人员管理',
        },
      },
      {
        name: 'ResourceDevice',
        path: '/resource/device',
        component: '/smart/index',
        meta: {
          keepAlive: true,
          title: '监控设备管理',
        },
      },
    ],
  },
  {
    name: 'System',
    path: '/system',
    meta: {
      title: '权限管理',
      icon: 'mdi:user-multiple-outline',
    },
    children: [
      {
        name: 'User',
        path: '/system/user',
        component: '/smart/index',
        meta: {
          keepAlive: true,
          title: '用户管理',
        },
      },
      {
        name: 'Role',
        path: '/system/role',
        component: '/smart/index',
        meta: {
          keepAlive: true,
          title: '角色管理',
        },
      },
    ],
  },
];
export const MOCK_MENUS = [
  {
    menus: [...dashboardMenus],
    username: 'vatic',
  },
  {
    menus: [...dashboardMenus],
    username: 'admin',
  },
  {
    menus: [...dashboardMenus],
    username: 'jack',
  },
];

export const MOCK_MENU_LIST = [
  {
    id: 1,
    name: 'Workspace',
    status: 1,
    type: 'menu',
    icon: 'mdi:dashboard',
    path: '/workspace',
    component: '/dashboard/workspace/index',
    meta: {
      icon: 'carbon:workspace',
      title: 'page.dashboard.workspace',
      affixTab: true,
      order: 0,
    },
  },
  {
    id: 2,
    meta: {
      icon: 'carbon:settings',
      order: 9997,
      title: 'system.title',
      badge: 'new',
      badgeType: 'normal',
      badgeVariants: 'primary',
    },
    status: 1,
    type: 'catalog',
    name: 'System',
    path: '/system',
    children: [
      {
        id: 201,
        pid: 2,
        path: '/system/menu',
        name: 'SystemMenu',
        authCode: 'System:Menu:List',
        status: 1,
        type: 'menu',
        meta: {
          icon: 'carbon:menu',
          title: 'system.menu.title',
        },
        component: '/system/menu/list',
        children: [
          {
            id: 20_101,
            pid: 201,
            name: 'SystemMenuCreate',
            status: 1,
            type: 'button',
            authCode: 'System:Menu:Create',
            meta: { title: 'common.create' },
          },
          {
            id: 20_102,
            pid: 201,
            name: 'SystemMenuEdit',
            status: 1,
            type: 'button',
            authCode: 'System:Menu:Edit',
            meta: { title: 'common.edit' },
          },
          {
            id: 20_103,
            pid: 201,
            name: 'SystemMenuDelete',
            status: 1,
            type: 'button',
            authCode: 'System:Menu:Delete',
            meta: { title: 'common.delete' },
          },
        ],
      },
      {
        id: 202,
        pid: 2,
        path: '/system/dept',
        name: 'SystemDept',
        status: 1,
        type: 'menu',
        authCode: 'System:Dept:List',
        meta: {
          icon: 'carbon:container-services',
          title: 'system.dept.title',
        },
        component: '/system/dept/list',
        children: [
          {
            id: 20_401,
            pid: 201,
            name: 'SystemDeptCreate',
            status: 1,
            type: 'button',
            authCode: 'System:Dept:Create',
            meta: { title: 'common.create' },
          },
          {
            id: 20_402,
            pid: 201,
            name: 'SystemDeptEdit',
            status: 1,
            type: 'button',
            authCode: 'System:Dept:Edit',
            meta: { title: 'common.edit' },
          },
          {
            id: 20_403,
            pid: 201,
            name: 'SystemDeptDelete',
            status: 1,
            type: 'button',
            authCode: 'System:Dept:Delete',
            meta: { title: 'common.delete' },
          },
        ],
      },
    ],
  },
  {
    id: 9,
    meta: {
      badgeType: 'dot',
      order: 9998,
      title: 'demos.vatic.title',
      icon: 'carbon:data-center',
    },
    name: 'Project',
    path: '/vatic-admin',
    type: 'catalog',
    status: 1,
    children: [
      {
        id: 901,
        pid: 9,
        name: 'VaticDocument',
        path: '/vatic-admin/document',
        component: 'IFrameView',
        type: 'embedded',
        status: 1,
        meta: {
          icon: 'carbon:book',
          iframeSrc: 'https://doc.vatic.pro',
          title: 'demos.vatic.document',
        },
      },
      {
        id: 902,
        pid: 9,
        name: 'VaticGithub',
        path: '/vatic-admin/github',
        component: 'IFrameView',
        type: 'link',
        status: 1,
        meta: {
          icon: 'carbon:logo-github',
          link: 'https://github.com/vaticjs/vue-vatic-admin',
          title: 'Github',
        },
      },
      {
        id: 903,
        pid: 9,
        name: 'VaticAntdv',
        path: '/vatic-admin/antdv',
        component: 'IFrameView',
        type: 'link',
        status: 0,
        meta: {
          icon: 'carbon:hexagon-vertical-solid',
          badgeType: 'dot',
          link: 'https://ant.vatic.pro',
          title: 'demos.vatic.antdv',
        },
      },
    ],
  },
  {
    id: 10,
    component: '_core/about/index',
    type: 'menu',
    status: 1,
    meta: {
      icon: 'lucide:copyright',
      order: 9999,
      title: 'demos.vatic.about',
    },
    name: 'About',
    path: '/about',
  },
];

export function getMenuIds(menus: any[]) {
  const ids: number[] = [];
  menus.forEach((item) => {
    ids.push(item.id);
    if (item.children && item.children.length > 0) {
      ids.push(...getMenuIds(item.children));
    }
  });
  return ids;
}
