import { requestClient } from '#/api/request';

async function getSamplePageList() {
  return requestClient.get('/sample/page/list');
}

async function getSampleList() {
  return requestClient.get('/sample/list');
}

export { getSampleList, getSamplePageList };
