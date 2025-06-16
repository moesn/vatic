export const getPageSchema = async () => {
  try {
    const name = location.pathname.split('/').reverse()[0];
    const response = await fetch(
      // `https://192.168.30.41:8888/file/schemas/${name}.json`,
      `/schemas/${name}.json`,
    );
    const schema = await response.json();
    return { schema, name } as any;
  } catch (error) {
    console.error('JSON文件格式错误:', error);
  }
};
