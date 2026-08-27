import type { Ref } from 'vue';

import type { HikiotPlayInit } from './data';

/**
 * 海康威视 WEB 插件（HikOpenVideoSDK）播放器封装
 *
 * 依赖本地安装的浏览器插件（仅 Windows + Chrome/Edge），全局对象 window.WebSocketClient。
 * 参考本项目已验证可用的联调实现 video_console/src/composables/useHikiotPlayer.ts：
 *  - 每次 initialize 前断开旧连接全新建立（插件窗口复用会与单路预览冲突：
 *    同 webTitle 重建挂起，必须先 disconnect 再新建）
 *  - 所有 SDK 调用走回调并检查 resp.code === 0
 *  - startPreview / startPlayback 固定 type=1，且 data 必须带 wndNo: -1
 *  - initWndParam 需补全三个固定 ys7 地址（取流通道依赖，缺失可能导致拉流失败）
 *  - 插件事件 detail 结构为 { cmd, data }：cameraPlayStats 的 playStats 在 data 内
 */
import { onBeforeUnmount, ref, watch } from 'vue';

import { message } from 'ant-design-vue';

import { getHikiotPlayInit } from './data';

interface HikiotPlayerOptions {
  containerRef: Ref<HTMLElement | undefined>;
  /** 当 deviceSerial 变化时，自动重建当前模式的播放 */
  deviceSerial: Ref<string | undefined>;
  /**
   * deviceSerial 变化时是否自动实况预览。
   * 插件为单实例：页面存在多个播放器实例时（如实况 + 回放），
   * 仅允许一个实例自动预览，否则会重复 initResource/startPreview
   * 且隐藏容器（display:none）的全 0 几何会把插件窗口挤成 0×0。
   * 回放实例请传 false，由外部按时间段调用 playPlayback。
   */
  autoPreview?: boolean | Ref<boolean>;
  channelNo?: number;
}

/** 插件连接失败错误码 → 中文提示（SDK 仅支持 Windows + Chrome/Edge） */
const CONNECT_ERROR_MAP: Record<number, string> = {
  6: '本机已有播放窗口（单实例限制）：请先关闭其他播放页面或重启插件服务后重试',
  888: '非支持系统（插件仅支持 Windows）',
  999: '非支持浏览器类型（需 Chrome/Edge）',
};

/** 官方文档要求的三个固定地址（取流通道依赖，缺失可能导致拉流失败） */
const FIXED_ADDRS = {
  authAddr: 'https://auth.ys7.com',
  ezvizAddr: 'https://open.ys7.com',
  openAddr: 'https://open.ys7.com',
};

function getClientCtor(): any {
  return (window as any).WebSocketClient;
}

/** SDK 回调风格调用 → Promise，resp.code !== 0 时抛错 */
function call(
  client: any,
  method: (...args: any[]) => void,
  params: object,
  label: string,
): Promise<any> {
  return new Promise<any>((resolve) => {
    method.call(client, params, resolve);
  }).then((resp: any) => {
    if (resp?.code !== 0) {
      throw new Error(
        `${label} 失败: ${resp?.message ?? resp?.msg ?? JSON.stringify(resp)}`,
      );
    }
    return resp;
  });
}

/** startPreview / startPlayback 等带 type 前缀参数的调用（type 固定 1） */
function callWithType(
  client: any,
  method: (...args: any[]) => void,
  params: object,
  label: string,
): Promise<any> {
  return new Promise<any>((resolve) => {
    method.call(client, 1, params, resolve);
  }).then((resp: any) => {
    if (resp?.code !== 0) {
      throw new Error(
        `${label} 失败: ${resp?.message ?? resp?.msg ?? JSON.stringify(resp)}`,
      );
    }
    return resp;
  });
}

export function useHikiotPlayer(options: HikiotPlayerOptions) {
  const { containerRef, deviceSerial } = options;
  const channelNo = options.channelNo ?? 1;

  const ready = ref(false);
  const error = ref('');
  const loading = ref(false);

  /** 固定 webTitle：插件单实例，同一 webTitle 复用同一窗口 */
  const WEB_TITLE = 'kab-video-hikiot';
  /** 画面就绪确认超时（ms）：超时未收到 cameraPlayStats.playStats===1 视为未确认 */
  const READY_TIMEOUT = 5000;

  let client: any = null;
  let connected = false;
  let rafId = 0;
  let readyTimer: number | undefined;

  const autoPreviewRef: Ref<boolean> =
    typeof options.autoPreview === 'object'
      ? options.autoPreview
      : ref(options.autoPreview ?? true);

  // ---- 插件窗口几何：宿主容器视口坐标（原生窗口仅感知浏览器客户区） ----
  // 插件窗口感知不到页面滚动，跟随容器必须在 scroll/resize 时重发几何；
  // getBoundingClientRect 即视口坐标（勿叠加滚动偏移），宽高兜底避免 0×0 窗口
  function currentGeom() {
    const rect = containerRef.value?.getBoundingClientRect();
    return {
      rect: {
        height: Math.max(Math.round(rect?.height ?? 240), 240),
        left: Math.round(rect?.left ?? 0),
        top: Math.round(rect?.top ?? 0),
        width: Math.max(Math.round(rect?.width ?? 320), 320),
      },
    };
  }

  function syncGeometry() {
    if (client && connected) {
      try {
        client.setWndGeometry(currentGeom(), () => {});
      } catch {
        // 忽略：连接可能已断开
      }
    }
  }

  function onGeometryEvent() {
    cancelAnimationFrame(rafId);
    // 滚动高频触发：rAF 节流，一帧至多同步一次几何
    rafId = requestAnimationFrame(syncGeometry);
  }

  // ---- 插件事件：画面就绪确认 / 提示 / 断连（window 'websocket-message' 广播） ----
  function onPluginEvent(event: Event) {
    const data = (event as CustomEvent).detail;
    if (!data) return;
    if (data.cmd === 'cameraPlayStats') {
      const s = data.data;
      if (Number(s?.playStats) === 1) {
        // 画面就绪确认：清除 5s 兜底定时器
        clearReadyTimer();
        ready.value = true;
        error.value = '';
      } else {
        // playStats !== 1：播放已停止（可能 token 过期）
        ready.value = false;
      }
    } else if (data.cmd === 'msgTips') {
      console.warn('[海康插件提示]', data);
    } else if (data.cmd === 'disconnect') {
      connected = false;
      ready.value = false;
    }
  }

  function clearReadyTimer() {
    if (readyTimer) {
      window.clearTimeout(readyTimer);
      readyTimer = undefined;
    }
  }

  /** 5 秒画面确认兜底：未收到 playStats=1 则提示（避免"播放中但无画面"误报） */
  function waitForReady() {
    clearReadyTimer();
    readyTimer = window.setTimeout(() => {
      if (!ready.value) {
        error.value = '画面未确认：请确认插件已安装、设备在线且已授权';
      }
    }, READY_TIMEOUT);
  }

  /** 断开旧连接（插件窗口复用会与单路预览冲突：同 webTitle 重建挂起，需全新建立） */
  function disconnect() {
    if (client) {
      try {
        client.disconnect();
      } catch {
        // 忽略：旧连接可能已断开
      }
      client = null;
    }
    connected = false;
  }

  /** 建立全新插件连接 */
  async function connectPlugin(): Promise<any> {
    const Ctor = getClientCtor();
    if (typeof Ctor !== 'function') {
      throw new Error(
        '未检测到海康 WEB 插件 SDK（需 Windows + Chrome/Edge 并安装 WEB 插件 exe）',
      );
    }
    disconnect();
    const c = new Ctor();
    client = c;
    try {
      const resp = await c.connect();
      if (!(resp?.code === 0 && resp?.message === 'connect success')) {
        throw new Error(`插件连接异常: ${resp?.message ?? resp?.msg ?? ''}`);
      }
    } catch (e: any) {
      disconnect();
      const hint =
        (e?.code !== undefined && CONNECT_ERROR_MAP[e.code]) ||
        e?.message ||
        String(e);
      throw new Error(`插件连接失败: ${hint}`);
    }
    connected = true;
    return c;
  }

  /**
   * 按文档第 5 章调用链初始化插件（play/init 拿到聚合数据后），
   * 每次全新建立连接（勿复用旧 client，窗口重建会挂起）
   */
  async function initPlugin(init: HikiotPlayInit) {
    const c = await connectPlugin();
    // 1. 配置密钥
    await call(
      c,
      c.setSecretConfigInfo,
      {
        bSecret: init.bSecret ?? '',
        openAppkey: init.openAppkey ?? '',
        openAppSecret: init.openAppSecret ?? '',
      },
      'setSecretConfigInfo',
    );
    // 2. 初始化窗口参数：补全三个固定地址（取流通道依赖）；
    //    勿传 bEmbed:false（旧版 exe 上会导致 playStats=0 取流直接失败）
    await call(
      c,
      c.initWndParam,
      {
        appAccessToken: init.appAccessToken ?? '',
        ezAccessData: init.ezAccessData ?? '',
        userAccessToken: init.userAccessToken ?? '',
        windowMode: init.windowMode ?? 1,
        ...FIXED_ADDRS,
      },
      'initWndParam',
    );
    if (!containerRef.value) {
      throw new Error('播放容器未就绪');
    }
    // 3. 绑定父窗口（固定 webTitle 复用单实例）
    await call(c, c.setParentWnd, { webTitle: WEB_TITLE }, 'setParentWnd');
    // 4. 同步容器几何位置（视口原值勿叠加滚动偏移）
    await call(c, c.setWndGeometry, currentGeom(), 'setWndGeometry');
    // 5. 显示插件窗口
    await call(c, c.showWnd, {}, 'showWnd');
  }

  async function playPreview(serial: string) {
    loading.value = true;
    ready.value = false;
    error.value = '';
    try {
      // 4.3 播放初始化：获取聚合数据（服务端 8 秒短缓存，可放心重试）
      const init = await getHikiotPlayInit(serial, channelNo);
      // 第 5 章调用链：初始化插件（每次全新连接）
      await initPlugin(init);
      const c = client!;
      await call(
        c,
        c.setPlayWindowType,
        { windowMode: 'preview' },
        'setPlayWindowType',
      );
      await call(
        c,
        c.initResource,
        {
          capacitysData: init.capacitysData ?? '',
          resourcesData: init.resourcesData ?? '',
          tokensData: init.tokensData ?? '',
        },
        'initResource',
      );
      // SDK 签名：startPreview(type=1, { deviceSerial, channelNo, wndNo: -1 })
      await callWithType(
        c,
        c.startPreview,
        {
          channelNo,
          deviceSerial: serial,
          wndNo: -1,
        },
        'startPreview',
      );
      // 确认画面就绪事件（cameraPlayStats.data.playStats === 1）
      waitForReady();
    } catch (error_: any) {
      // 业务层 code:401 表示未完成海康用户授权（文档第 3 章）
      error.value =
        error_?.payload?.code === 401
          ? '设备未完成海康用户授权，请联系管理员授权后重试'
          : (error_?.message ?? '海康实况加载失败');
      message.error(error.value);
    } finally {
      loading.value = false;
    }
  }

  async function playPlayback(
    serial: string,
    startTime: string,
    endTime: string,
  ) {
    loading.value = true;
    ready.value = false;
    error.value = '';
    try {
      // 4.3 播放初始化：每次播放前都重新获取当前设备聚合数据
      // （切换设备后旧数据属于上一台设备，直接复用会导致播放错乱；
      //   服务端有 8 秒短缓存，重复调用不产生上游请求，可放心重试）
      const init = await getHikiotPlayInit(serial, channelNo);
      await initPlugin(init);
      const c = client!;
      await call(
        c,
        c.setPlayWindowType,
        { windowMode: 'playback' },
        'setPlayWindowType(playback)',
      );
      // SDK 签名：startPlayback(type=1, { deviceSerial, channelNo, startTime, endTime, wndNo, searchType })
      await callWithType(
        c,
        c.startPlayback,
        {
          channelNo,
          deviceSerial: serial,
          endTime,
          searchType: 1,
          startTime,
          wndNo: -1,
        },
        'startPlayback',
      );
      waitForReady();
    } catch (error_: any) {
      error.value =
        error_?.payload?.code === 401
          ? '设备未完成海康用户授权，请联系管理员授权后重试'
          : (error_?.message ?? '海康回放加载失败');
      message.error(error.value);
    } finally {
      loading.value = false;
    }
  }

  /** 停止播放：隐藏插件窗口（SDK 无 stopAllPreview 方法） */
  function stop() {
    clearReadyTimer();
    ready.value = false;
    if (client && connected) {
      try {
        client.hideWnd({}, () => {});
      } catch {
        // 忽略：连接可能已断开
      }
    }
  }

  function destroy() {
    stop();
    disconnect();
    cancelAnimationFrame(rafId);
  }

  // 事件监听在组合式函数创建时统一挂载，销毁时统一移除
  window.addEventListener('resize', onGeometryEvent);
  // scroll 不冒泡：捕获阶段挂 window 才能覆盖页面级与任意祖先容器的滚动
  window.addEventListener('scroll', onGeometryEvent, true);
  window.addEventListener('websocket-message', onPluginEvent as EventListener);
  onBeforeUnmount(() => {
    window.removeEventListener('resize', onGeometryEvent);
    window.removeEventListener('scroll', onGeometryEvent, true);
    window.removeEventListener(
      'websocket-message',
      onPluginEvent as EventListener,
    );
    destroy();
  });

  // deviceSerial / autoPreview 变化时自动重建预览；不在预览范围（非本页签/回放实例）时停止
  watch([deviceSerial, autoPreviewRef], ([serial, auto]) => {
    if (serial && auto) {
      playPreview(serial);
    } else {
      stop();
    }
  });

  return {
    destroy,
    error,
    loading,
    playPlayback,
    playPreview,
    ready,
    stop,
  };
}
