import { faker } from '@faker-js/faker';
import { verifyAccessToken } from '~/utils/jwt-utils';
import { unAuthorizedResponse, usePageResponseSuccess } from '~/utils/response';

function generateMockDataList(count: number) {
  const dataList = [];

  for (let i = 0; i < count; i++) {
    const dataItem: Record<string, any> = {
      id: faker.string.uuid(),
      name: faker.company.name(),
      shortName: faker.company.buzzNoun(),
      code: faker.number.int({
        min: 100_000_000_000_000,
        max: 1_000_000_000_000_000,
      }),
      phone: faker.phone.number({ style: 'international' }),
      license: faker.string.alpha(10),
      legal: faker.string.alpha(10),
      legalPhone: faker.string.alpha(10),
      licenseTime: faker.string.alpha(10),
      scope: faker.string.alpha(10),
      staffCount: faker.string.alpha(10),
    };

    dataList.push(dataItem);
  }

  return dataList;
}

const mockData = generateMockDataList(1);

export default eventHandler(async (event) => {
  const userinfo = verifyAccessToken(event);
  if (!userinfo) {
    return unAuthorizedResponse(event);
  }

  const {
    page = 1,
    pageSize = 20,
    name,
    id,
    remark,
    startTime,
    endTime,
    status,
  } = getQuery(event);
  let listData = structuredClone(mockData);
  if (name) {
    listData = listData.filter((item) =>
      item.name.toLowerCase().includes(String(name).toLowerCase()),
    );
  }
  if (id) {
    listData = listData.filter((item) =>
      item.id.toLowerCase().includes(String(id).toLowerCase()),
    );
  }
  if (remark) {
    listData = listData.filter((item) =>
      item.remark?.toLowerCase()?.includes(String(remark).toLowerCase()),
    );
  }
  if (startTime) {
    listData = listData.filter((item) => item.createTime >= startTime);
  }
  if (endTime) {
    listData = listData.filter((item) => item.createTime <= endTime);
  }
  if (['0', '1'].includes(status as string)) {
    listData = listData.filter((item) => item.status === Number(status));
  }
  return usePageResponseSuccess(page as string, pageSize as string, listData);
});
