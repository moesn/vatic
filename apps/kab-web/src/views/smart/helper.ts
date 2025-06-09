import type { VaticFormSchema } from '@vatic-core/form-ui';

export const parseApi = (api: any, row: any) => {
  let { url, body } = api;
  if (url.includes('$')) {
    const urls = url.split('$');
    url = urls[0] + row[urls[1]];
  }
  return { url, body };
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
    const formItem: VaticFormSchema = {
      component: item.type || 'Input',
      fieldName: item.field,
      label: item.title,
      rules: item.rules,
      labelWidth,
    };

    if (item.required) {
      switch (item.type) {
        case 'RadioGroup': {
          formItem.rules = 'selectRequired';
          break;
        }
        default: {
          formItem.rules = 'required';
        }
      }
    }

    if (item.triggerField) {
      formItem.dependencies = {
        show: (values) => {
          return [item.triggerValue].includes(values[item.triggerField]);
        },
        triggerFields: [item.triggerField],
      };
    }

    switch (item.type) {
      case 'RadioGroup': {
        formItem.componentProps = {
          options: item.options,
        };
        break;
      }
      case 'Select': {
        formItem.componentProps = {
          allowClear: true,
          filterOption: true,
          options: item.options,
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
