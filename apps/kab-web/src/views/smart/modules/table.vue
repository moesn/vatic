<script lang="ts" setup>
import type { VaticGridProps, VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { useVaticDrawer } from '@vatic/common-ui';

import dayjs from 'dayjs';

import { useVaticVxeGrid } from '#/adapter/vxe-table';
import { requestClient } from '#/api/request';

import { parseApi, parseFormSchema, parseTableColumns } from '../helper';

const drawerInit = ref(false);
const drawerTitle = ref('');
let Grid: any;

const [Drawer, DrawerApi] = useVaticDrawer({
  async onOpenChange(isOpen) {
    if (isOpen) {
      const table = DrawerApi.getSchema();
      const {
        api,
        columns,
        search: searchSchema,
        keyField,
        cellHeight,
        title,
        dataField,
      } = table;
      drawerTitle.value = title;

      const dateFields: any = [];
      const datetimeFields: any = [];
      columns.forEach((column: any) => {
        const { format, field } = column;
        switch (format) {
          case 'date': {
            dateFields.push(field);
            break;
          }
          case 'datetime': {
            datetimeFields.push(field);
            break;
          }
        }
      });

      parseTableColumns(columns);

      const gridOptions: VxeTableGridOptions = {
        columns,
        checkboxConfig: {
          highlight: true,
          labelField: 'name',
        },
        exportConfig: {
          excludeFields: ['operation'],
        },
        cellConfig: {
          height: cellHeight || 40,
        },
        height: 'auto',
        keepSource: true,
        proxyConfig: {
          ajax: {
            query: async ({ page, sort }, search) => {
              const params = {
                pageNo: page.currentPage,
                pageSize: page.pageSize,
                sortBy: sort.field,
                sortOrder: sort.order,
                ...search,
              };

              const apiUrl = parseApi(api, DrawerApi.getData());
              const rawData = await requestClient.get(apiUrl, { params });
              const resData = dataField
                ? rawData[dataField]
                : rawData.records || rawData;

              if (dateFields.length > 0 || datetimeFields.length > 0) {
                resData.map((d: any) => {
                  try {
                    dateFields.forEach((field: string) => {
                      d[field] =
                        d[field] && dayjs(d[field]).format('YYYY-MM-DD');
                    });
                    datetimeFields.forEach((field: string) => {
                      d[field] =
                        d[field] &&
                        dayjs(d[field]).format('YYYY-MM-DD HH:mm:ss');
                    });
                  } catch {}
                  return d;
                });
              }

              if (rawData.current) {
                return { ...rawData, records: resData };
              }
              return resData;
            },
          },
          sort: true,
        },
        rowConfig: {
          keyField,
          isCurrent: true,
          isHover: true,
        },
        pagerConfig: {
          enabled: !dataField,
        },
        sortConfig: {
          defaultSort: { field: 'deviceName', order: 'desc' },
          remote: true,
        },
        treeConfig: {},
      };

      const options: VaticGridProps = { gridOptions };

      if (searchSchema) {
        await parseFormSchema(searchSchema);
        options.formOptions = {
          fieldMappingTime: searchSchema
            .filter((s: any) => s.type === 'RangePicker')
            .map((d: any) => [d.field, d.rangeFields]),
          schema: searchSchema,
          wrapperClass: 'grid-cols-6',
          showCollapseButton: false,
        };
      }

      [Grid] = useVaticVxeGrid(options);
      drawerInit.value = true;
    }
  },
});
</script>
<template>
  <Drawer :title="drawerTitle">
    <Grid v-if="drawerInit" />
  </Drawer>
</template>
