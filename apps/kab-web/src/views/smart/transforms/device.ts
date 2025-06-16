export function transformData(data: any) {
  data.coordinate = [data.longitude, data.latitude];
}

export function transformBody(body: any) {
  body.longitude = body.coordinate[0];
  body.latitude = body.coordinate[1];
}

export function afterFetch(rawData: any) {
  function disableLevel(data: any) {
    data.forEach((d: any) => {
      if (d.value === '520111') {
        rawData.length = 0;
      } else if (d.parentId === '520111') {
        rawData.push(d);
      }
      const len = d.value?.length;
      if (len < 8) {
        d.disabled = true;
      }
      if (d.children) {
        disableLevel(d.children);
      }
    });
  }

  disableLevel(rawData);
}
