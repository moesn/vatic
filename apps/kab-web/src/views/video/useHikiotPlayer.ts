import type { Ref } from 'vue';

import type { HikiotPlayInit } from './data';

/**
 * 海康威视 WEB 插件（Hikiot / HikOpenVideoSDK）播放器封装
 *
 * 依赖本地安装的浏览器插件（仅 Windows + Chrome/Edge），全局对象 window.WebSocketClient。
 * 参考 hikiot-frontend-api.md 第 5 章调用链（文档为简写，SDK 实际签名为单对象参数，
 * 见 public/lib/HikOpenVideoSDK-1.0.1.min.js）：
 *  - 实况：setSecretConfigInfo({bSecret,openAppkey,openAppSecret})
 *           -> initWndParam({ezAccessData,appAccessToken,userAccessToken,windowMode})
 *           -> setParentWnd({webTitle}) -> setWndGeometry({rect})
 *           -> showWnd -> setPlayWindowType({windowMode:'preview'})
 *           -> initResource({resourcesData,tokensData,capacitysData})
 *           -> startPreview(窗口索引, {deviceSerial,channelNo})
 *  - 回放：setPlayWindowType({windowMode:'playback'})
 *           -> startPlayback(窗口索引, {deviceSerial,channelNo,startTime,endTime,searchType:1})
 *
 * 因插件为单例且页面同一时刻仅播放一路，本模块以单例方式管理 client 与窗口。
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

function getClientCtor(): any {
  return (window as any).WebSocketClient;
}

/** 同步原生插件窗口到容器几何位置（滚动/缩放需节流触发） */
function computeGeometry(container: HTMLElement) {
  const rect = container.getBoundingClientRect();
  return {
    bottom: rect.bottom,
    height: rect.height,
    left: rect.left,
    right: rect.right,
    top: rect.top,
    width: rect.width,
  };
}

export function useHikiotPlayer(options: HikiotPlayerOptions) {
  const { containerRef, deviceSerial } = options;
  const channelNo = options.channelNo ?? 1;

  const ready = ref(false);
  const error = ref('');
  const loading = ref(false);

  /** 固定 webTitle：插件单实例，同一 webTitle 复用同一窗口 */
  const WEB_TITLE = 'kab-video-hikiot';
  /** 单路播放固定使用第一个窗口（窗口索引从 0 开始） */
  const WND_INDEX = 0;
  /** 画面就绪确认超时（ms）：超时未收到 cameraPlayStats.playStats===1 视为未确认 */
  const READY_TIMEOUT = 5000;

  let client: any = null;
  let connected = false;
  let rafId = 0;
  let readyTimer: null | ReturnType<typeof setTimeout> = null;
  let cleanupFns: Array<() => void> = [];

  const autoPreviewRef: Ref<boolean> =
    typeof options.autoPreview === 'object'
      ? options.autoPreview
      : ref(options.autoPreview ?? true);

  function bindGeometry() {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      if (!client || !containerRef.value) return;
      // SDK 签名：setWndGeometry({ rect })，内部按 devicePixelRatio 换算
      client.setWndGeometry({ rect: computeGeometry(containerRef.value) });
    });
  }

  function onGeometryEvent() {
    bindGeometry();
  }

  async function ensureConnected(): Promise<any> {
    const Ctor = getClientCtor();
    if (!Ctor) {
      throw new Error(
        '未检测到海康 WEB 插件，请安装 HikOpenVideoSDK（仅支持 Windows + Chrome/Edge）',
      );
    }
    if (!connected) {
      client = new Ctor();
      // connect() 返回 Promise：非 Windows(888)/浏览器不符(999)/插件服务未启动(WS 连接失败)时 reject
      try {
        await client.connect();
      } catch (error_: any) {
        connected = false;
        client = null;
        throw new Error(
          error_?.message ??
            '无法连接本地海康插件服务（ws://127.0.0.1:18002）：请确认已在 Windows 电脑安装并启动 HikOpenVideoSDK 插件（≥ v1.2.0，仅支持 Windows + Chrome/Edge）',
        );
      }
      connected = true;

      // SDK 无 on 方法：消息通过 window 的 'websocket-message' CustomEvent 广播
      window.addEventListener('websocket-message', onPluginEvent);
      cleanupFns.push(() => {
        window.removeEventListener('websocket-message', onPluginEvent);
      });

      window.addEventListener('resize', onGeometryEvent);
      window.addEventListener('scroll', onGeometryEvent, true);
      cleanupFns.push(() => {
        window.removeEventListener('resize', onGeometryEvent);
        window.removeEventListener('scroll', onGeometryEvent, true);
      });
    }
    return client;
  }

  function clearReadyTimer() {
    if (readyTimer) {
      clearTimeout(readyTimer);
      readyTimer = null;
    }
  }

  function waitForReady() {
    clearReadyTimer();
    readyTimer = setTimeout(() => {
      // 5s 内未收到画面就绪事件：提示但未中断（设备可能在线但事件延迟）
      if (!ready.value) {
        error.value = '画面未确认：请确认插件已安装、设备在线且已授权';
      }
    }, READY_TIMEOUT);
  }

  /**
   * window 'websocket-message' CustomEvent 处理：
   * detail 为插件消息（cmd/funcName 区分类型），断连时 detail.cmd === 'disconnect'
   */
  function onPluginEvent(event: Event) {
    const detail = (event as CustomEvent).detail ?? {};
    if (detail.cmd === 'disconnect') {
      ready.value = false;
      connected = false;
      return;
    }
    const funcName = detail.funcName ?? detail.cmd;
    if (
      funcName === 'cameraPlayStats' && // playStats === 1 表示画面已就绪
      Number(detail.playStats) === 1
    ) {
      clearReadyTimer();
      ready.value = true;
      error.value = '';
    }
  }

  /**
   * 按文档第 5 章调用链初始化插件（play/init 拿到聚合数据后）。
   * SDK 实际签名为单对象参数（文档调用链为简写）
   */
  async function initPlugin(init: HikiotPlayInit) {
    const c = await ensureConnected();
    // 1. 配置密钥：setSecretConfigInfo({ bSecret, openAppkey, openAppSecret })
    c.setSecretConfigInfo({
      bSecret: init.bSecret ?? '',
      openAppkey: init.openAppkey ?? '',
      openAppSecret: init.openAppSecret ?? '',
    });
    // 2. 初始化窗口参数：initWndParam 单对象展开（地址字段缺省时 SDK 用内置默认值）
    //    勿传 bEmbed:false：实测旧版 exe 上会导致 playStats=0 取流直接失败
    const wndParam: Record<string, any> = {
      appAccessToken: init.appAccessToken ?? '',
      ezAccessData: init.ezAccessData ?? '',
      userAccessToken: init.userAccessToken ?? '',
      windowMode: init.windowMode ?? 1,
    };
    if (init.ezvizAddr) wndParam.ezvizAddr = init.ezvizAddr;
    if (init.authAddr) wndParam.authAddr = init.authAddr;
    if (init.openAddr) wndParam.openAddr = init.openAddr;
    c.initWndParam(wndParam);
    if (!containerRef.value) {
      throw new Error('播放容器未就绪');
    }
    // 3. 绑定父窗口（固定 webTitle 复用单实例）
    c.setParentWnd({ webTitle: WEB_TITLE });
    // 4. 同步容器几何位置：setWndGeometry({ rect })，视口原值勿叠加滚动偏移
    c.setWndGeometry({ rect: computeGeometry(containerRef.value) });
    // 5. 显示插件窗口
    c.showWnd();
  }

  async function playPreview(serial: string) {
    loading.value = true;
    ready.value = false;
    error.value = '';
    try {
      // 4.3 播放初始化：获取聚合数据（服务端短缓存，可放心重试）
      const init = await getHikiotPlayInit(serial, channelNo);
      // 第 5 章：初始化插件并预览
      await initPlugin(init);
      const c = client!;
      c.setPlayWindowType({ windowMode: 'preview' });
      // SDK 签名：initResource 单对象（三个整包数据作为字段透传）
      c.initResource({
        capacitysData: init.capacitysData ?? '',
        resourcesData: init.resourcesData ?? '',
        tokensData: init.tokensData ?? '',
      });
      // SDK 签名：startPreview(窗口索引, { deviceSerial, channelNo })
      c.startPreview(WND_INDEX, {
        channelNo,
        deviceSerial: serial,
      });
      // 确认画面就绪事件（cameraPlayStats.playStats === 1）
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
      c.setPlayWindowType({ windowMode: 'playback' });
      // SDK 签名：startPlayback(窗口索引, { deviceSerial, channelNo, startTime, endTime, searchType })
      c.startPlayback(WND_INDEX, {
        channelNo,
        deviceSerial: serial,
        endTime,
        searchType: 1,
        startTime,
      });
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

  function stop() {
    clearReadyTimer();
    ready.value = false;
    if (client) {
      try {
        client.stopAllPreview?.();
      } catch {
        // 忽略：插件可能未处于预览状态
      }
    }
  }

  function destroy() {
    stop();
    cleanupFns.forEach((fn) => fn());
    cleanupFns = [];
    if (client) {
      try {
        client.disconnect?.();
      } catch {
        // 忽略
      }
      client = null;
      connected = false;
    }
    cancelAnimationFrame(rafId);
  }

  // deviceSerial / autoPreview 变化时自动重建预览；不在预览范围（非本页签/回放实例）时停止
  watch([deviceSerial, autoPreviewRef], ([serial, auto]) => {
    if (serial && auto) {
      playPreview(serial);
    } else {
      stop();
    }
  });

  onBeforeUnmount(destroy);

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
