import type { SelectProps } from 'ant-design-vue';

import type { ApiSelectProps } from '@vatic/common-ui';

import type { VaticFormSchema } from '@vatic-core/form-ui';
import type { TreeProps } from '@vatic-core/shadcn-ui';
import type { Recordable } from '@vatic-core/typings';

import { requestClient } from '#/api/request';

export const parseApi = (api: string, row: any) => {
  if (api.includes('$')) {
    const urls: any = api.split('$');
    return `${urls[0]}${row[urls[1]]}`;
  }
  return api;
};

export const parseTableColumns = (columns: any[]) => {
  columns.forEach((item: any) => {
    let len = 0;
    const { title } = item;
    if (title) {
      for (let i = 0; i < title.length; i++) {
        const code: number = title.codePointAt(i) || 0;
        len += code >= 0x00 && code <= 0xef ? 1 : 2;
      }
      item.minWidth = len * 7.5;
    }
  });
};

export const parseFormSchema = async (
  formSchema: any[] | VaticFormSchema[],
) => {
  const labelWidth = calcLabelWidth(formSchema);

  for (const formItem of formSchema) {
    const {
      type,
      field,
      title,
      rules,
      required,
      triggerField,
      triggerValue,
      api,
      labelField,
      props,
    } = formItem;

    formItem.component = type || 'Input';
    formItem.fieldName = field;
    formItem.label = title;
    formItem.rules = rules;
    formItem.labelWidth = labelWidth;
    formItem.controlClass = 'w-full';

    if (required) {
      switch (type) {
        case 'RadioGroup': {
          formItem.rules = 'selectRequired';
          break;
        }
        default: {
          formItem.rules = 'required';
        }
      }
    }

    if (triggerField) {
      formItem.dependencies = {
        show: (values: any) => {
          return [triggerValue].includes(values[triggerField]);
        },
        triggerFields: [triggerField],
      };
    }

    switch (type) {
      case 'ApiSelect': {
        formItem.componentProps = Object.assign(
          {
            afterFetch: (data: any) => {
              const records = data.records || data;
              return records.map((record: any) => ({
                label: record[labelField] || record.name,
                value: record.code || record.id,
              }));
            },
            api: () => requestClient.get(api),
            autoSelect: 'first',
          } as ApiSelectProps,
          props || {},
        );
        break;
      }
      case 'Select': {
        formItem.componentProps = Object.assign(
          {
            allowClear: true,
            filterOption: true,
            placeholder: '请选择',
            showSearch: true,
          } as SelectProps,
          props || {},
        );
        break;
      }
      case 'VaticTree': {
        if (api) {
          const treeData = await requestClient.get(api);
          formItem.componentProps = Object.assign(
            {
              treeData: JSON.parse(
                JSON.stringify(treeData).replaceAll(
                  '"children":[]',
                  '"children":null',
                ),
              ),
              defaultExpandedLevel: 2,
              multiple: true,
              labelField: 'name',
              valueField: 'id',
              iconField: 'icon',
              getNodeClass: (node: Recordable<any>) => {
                const classes: string[] = [];
                if (node.value?.type.toLowerCase() === 'button') {
                  classes.push('inline-flex');
                  if (node.index % 3 >= 1) {
                    classes.push('!pl-0');
                  }
                }

                return classes.join(' ');
              },
            } as TreeProps,
            props || {},
          );
        }
        break;
      }
    }
  }
};

const calcLabelWidth = (formSchema: any[]) => {
  return Math.max(
    ...formSchema.map((item: any) => {
      if (item.labelWidth || !item.title) {
        return item.labelWidth || 0;
      }
      let len = 2;
      for (let i = 0; i < item.title.length; i++) {
        const code: number = item.title.codePointAt(i) || 0;
        len += code >= 0x00 && code <= 0xef ? 1 : 2;
      }
      return len * 7;
    }),
  );
};
