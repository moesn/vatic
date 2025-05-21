import { faker } from '@faker-js/faker';
import { verifyAccessToken } from '~/utils/jwt-utils';
import { unAuthorizedResponse, usePageResponseSuccess } from '~/utils/response';

function generateMockDataList(count: number) {
  const dataList = [];

  for (let i = 0; i < count; i++) {
    const dataItem: Record<string, any> = {
      id: faker.string.uuid(),
      plateNo:
        faker.string.alpha(1) +
        faker.number.int({
          min: 10_000,
          max: 99_999,
        }),
      VIN: faker.number.int({
        min: 100_000_000_000_000,
        max: 1_000_000_000_000_000,
      }),
      maintainCoName: faker.string.alpha(5),
      maintainCoCode: faker.string.alpha(5),
      inspectionDate: faker.string.alpha(5),
      epLicenseExpire: faker.string.alpha(5),
      ownerName: faker.string.alpha(5),
      capacity: faker.string.alpha(5),
      engineNo: faker.string.alpha(5),
      modelNo: faker.string.alpha(5),
      type: faker.string.alpha(5),
      opLicenseNo: faker.string.alpha(5),
    };

    dataList.push(dataItem);
  }

  return dataList;
}

const mockData = generateMockDataList(100);

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
