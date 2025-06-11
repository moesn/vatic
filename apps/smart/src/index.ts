export const getPageSchema = async () => {
  try {
    const schema = location.pathname.split('/').reverse()[0];
    const response = await fetch(
      // `https://192.168.30.41:8888/file/schemas/${schema}.json`,
      `/schemas/${schema}.json`,
    );
    const options = await response.json();
    return options;
  } catch (error) {
    console.error('JSON文件格式错误:', error);
  }
};
