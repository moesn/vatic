import { faker } from '@faker-js/faker';
import { verifyAccessToken } from '~/utils/jwt-utils';
import { unAuthorizedResponse, useResponseSuccess } from '~/utils/response';

function generateMockDataList(count: number) {
  const dataList = [];

  for (let i = 0; i < count; i++) {
    const dataItem: Record<string, any> = {
      id: faker.string.uuid(),
      name: faker.string.alpha(5),
      rt$imageUrl: '/test.jpg',
    };

    dataList.push(dataItem);
  }

  return dataList;
}

const mockData = generateMockDataList(20);

export default eventHandler(async (event) => {
  const userinfo = verifyAccessToken(event);
  if (!userinfo) {
    return unAuthorizedResponse(event);
  }

  const listData = structuredClone(mockData);

  return useResponseSuccess(listData);
});
