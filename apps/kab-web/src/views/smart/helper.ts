export const parseApi = (api: any, row: any) => {
  let { url, body } = api;
  if (url.includes('$')) {
    const urls = url.split('$');
    url = urls[0] + row[urls[1]];
  }
  return { url, body };
};
