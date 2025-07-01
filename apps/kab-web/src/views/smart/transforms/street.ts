export function transformBody(body: any) {
  body.parentCode = body.districtCode;
  body.level = Math.ceil(body.districtCode?.length / 2 + 1);
}

export function afterFetch(rawData: any) {
  function disableLevel(data: any) {
    data.forEach((d: any) => {
      if (d.value === '520111') {
        rawData.length = 0;
        rawData.push(d);
      }
      const len = d.value?.length;
      if (len < 6 || len > 8) {
        d.disabled = true;
      }
      if (d.children) {
        disableLevel(d.children);
      }
    });
  }

  disableLevel(rawData);
}

export function transformTableData(resData: any) {
  function deleteLevel(data: any) {
    data.forEach((d: any) => {
      if (d.code === '5201') {
        resData.records.length = 0;
      } else if (d.parentId === '5201') {
        resData.records.push(d);
      }
      if (d.children) {
        deleteLevel(d.children);
      }
    });
  }

  deleteLevel(resData.records);
}
