import type { RouteRecordStringComponent } from '@vatic/types';

import { requestClient } from '#/api/request';

/**
 * 获取用户所有菜单
 */
export async function getAllMenusApi() {
  const res = await requestClient.get<RouteRecordStringComponent[]>(
    '/kab/auth/queryPermissionsTree',
  );

  return new Promise((resolve) => {
    const menus = res
      .filter((d: any) => d.createdTime.startsWith('2025'))
      .map((item: any) => {
        const { code, path, name, component, keepAlive, icon } = item;

        const menu: any = {
          name: code,
          path,
          component,
          meta: {
            title: name,
            affixTab: code.toLowerCase() === 'dashboard',
            keepAlive,
            icon,
          },
        };

        const children = item.children?.filter(
          (d: any) => d.path && d.component,
        );

        if (children && children.length > 0) {
          menu.children = children.map((child: any) => {
            const { code, path, name, component, keepAlive, icon } = child;

            return {
              name: code,
              path,
              component,
              meta: {
                title: name,
                affixTab: false,
                keepAlive: !!keepAlive,
                icon,
              },
            };
          });
        }

        return menu;
      });

    resolve(menus);
  });
}
