import type {
  DatePickerProps,
  InputNumberProps,
  RadioGroupProps,
  SelectProps,
  SwitchProps,
} from 'ant-design-vue';

import type { ApiSelectProps } from '@vatic/common-ui';

import type { VaticFormSchema } from '@vatic-core/form-ui';
import type { TreeProps } from '@vatic-core/shadcn-ui';
import type { Recordable } from '@vatic-core/typings';

import { z } from '@vatic/common-ui';

import { requestClient } from '#/api/request';

import * as transforms from './transforms';

const transformsAny: any = transforms;

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
    const { title, type, options } = item;
    if (title) {
      for (let i = 0; i < title.length; i++) {
        const code: number = title.codePointAt(i) || 0;
        len += code >= 0x00 && code <= 0xef ? 1 : 2;
      }
      item.minWidth = len * 7;
    }

    switch (type) {
      case 'Image': {
        item.cellRender = {
          name: 'CellImage',
        };
        break;
      }
      case 'List': {
        item.cellRender = {
          name: 'ListTag',
        };
        break;
      }
      case 'Tag': {
        item.cellRender = { name: 'CellTag', options };
        break;
      }
    }
  });
};

export const parseFormSchema = async (
  formSchema: any[] | VaticFormSchema[],
  pageName: string = '',
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
      valueField,
      labelField,
      props,
      afterFetch,
      options,
      span,
    } = formItem;

    formItem.component = type || 'Input';
    formItem.fieldName = field;
    formItem.label = title;
    formItem.labelWidth = labelWidth;
    formItem.formItemClass = `col-span-${span || 2}`;

    if (!['Switch'].includes(type)) {
      formItem.controlClass = 'w-full';
    }

    if (rules) {
      let rule: any;
      switch (rules) {
        case 'email': {
          rule = z.string().email('无效的邮箱');
          break;
        }
        case 'idCard': {
          rule = z
            .string()
            .length(18, '长度必须为18位')
            .regex(/^[1-9]\d{5}/, '地址码格式错误')
            .regex(
              /(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/,
              '出生日期无效',
            )
            .refine((id) => {
              const weights = [
                7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2,
              ];
              const checkCodes = [
                '1',
                '0',
                'X',
                '9',
                '8',
                '7',
                '6',
                '5',
                '4',
                '3',
                '2',
              ];

              // eslint-disable-next-line unicorn/no-useless-spread
              const sum = [...id.slice(0, 17)].reduce(
                (acc, digit, i) => acc + Number.parseInt(digit) * weights[i],
                0,
              );
              return id[17]?.toUpperCase() === checkCodes[sum % 11];
            }, '校验码不匹配');
          break;
        }
        case 'phone': {
          rule = z
            .string()
            .regex(
              /^1(?:3\d|4[014-9]|5[0-35-9]|6[2567]|7[0-8]|8\d|9[0-35-9])\d{8}$/,
              { message: '无效的手机号码' },
            );
          break;
        }
      }
      formItem.rules = required ? rule : rule.optional();
    } else if (required) {
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

    if (triggerField && triggerValue) {
      formItem.dependencies = {
        if: (formData: any) => {
          return triggerValue.split('|').includes(formData[triggerField]);
        },
        trigger: (formData: any) => {
          formData[field] = null;
        },
        triggerFields: [triggerField],
      };
    }

    switch (type) {
      case 'ApiSelect': {
        formItem.componentProps = Object.assign(
          {
            api: () => requestClient.get(api),
            showSearch: true,
            autoSelect: props?.mode === 'multiple' ? false : 'first',
            labelField: labelField || 'name',
            valueField: valueField || 'id',
          } as unknown as ApiSelectProps,
          props || {},
        );
        break;
      }
      case 'ApiTreeSelect': {
        if (api) {
          formItem.componentProps = Object.assign(
            {
              allowClear: true,
              showSearch: true,
              api: () => requestClient.get(api),
              class: 'w-full',
              labelField: labelField || 'name',
              valueField: valueField || 'id',
              childrenField: 'children',
              afterFetch: (data: { name: string; path: string }[]) => {
                if (afterFetch) {
                  transformsAny[
                    afterFetch === true ? pageName : afterFetch
                  ]?.afterFetch(data);
                }
              },
            } as unknown as ApiSelectProps,
            props || {},
          );
        }
        break;
      }
      case 'DatePicker': {
        formItem.componentProps = Object.assign(
          {
            format: 'YYYY-MM-DD',
            valueFormat: 'YYYY-MM-DD',
          } as DatePickerProps,
          props || {},
        );
        break;
      }
      case 'InputNumber': {
        formItem.componentProps = Object.assign(
          {} as InputNumberProps,
          props || {},
        );
        break;
      }
      case 'RadioGroup': {
        formItem.componentProps = Object.assign(
          {
            options,
          } as RadioGroupProps,
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
      case 'Switch': {
        formItem.componentProps = Object.assign(
          {
            checkedChildren: '开',
            unCheckedChildren: '关',
          } as SwitchProps,
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
      return len * 7.2;
    }),
  );
};
