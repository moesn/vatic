const BasicLayout = () => import('./basic.vue');
const AuthPageLayout = () => import('./auth.vue');

const IFrameView = () => import('@vatic/layouts').then((m) => m.IFrameView);

export { AuthPageLayout, BasicLayout, IFrameView };
