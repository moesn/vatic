import type { VaticFormSchema } from '@vatic-core/form-ui';

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

export const parseFormSchema = (formSchema: any[]) => {
  const labelWidth = calcLabelWidth(formSchema);

  return formSchema.map((item: any) => {
    const {
      type,
      field,
      title,
      rules,
      required,
      triggerField,
      triggerValue,
      options,
      api,
      labelField,
    } = item;

    const formItem: VaticFormSchema = {
      component: type || 'Input',
      fieldName: field,
      label: title,
      rules,
      labelWidth,
      controlClass: 'w-full',
    };

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
        show: (values) => {
          return [triggerValue].includes(values[triggerField]);
        },
        triggerFields: [triggerField],
      };
    }

    switch (type) {
      case 'ApiSelect': {
        formItem.componentProps = {
          afterFetch: (data: any) => {
            const records = data.records || data;
            return records.map((record: any) => ({
              label: record[labelField] || record.name,
              value: record.code || record.id,
            }));
          },
          api: () => requestClient.get(api),
          autoSelect: 'first',
          width: 200,
        };
        break;
      }
      case 'RadioGroup': {
        formItem.componentProps = {
          options,
        };
        break;
      }
      case 'Select': {
        formItem.componentProps = {
          allowClear: true,
          filterOption: true,
          options,
          placeholder: '请选择',
          showSearch: true,
        };
        break;
      }
    }

    return formItem;
  });
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
