import { Window } from "@tauri-apps/api/window";
import { getSetting } from "./store";
import { exit } from "@tauri-apps/plugin-process";

// 定义关闭事件接口
interface CloseRequestedEvent {
  preventDefault: () => void;
}

/**
 * 初始化窗口关闭事件处理器
 * 当窗口关闭时，根据最小化到托盘设置决定是隐藏窗口还是退出应用
 */
export async function setupWindowCloseHandler(): Promise<void> {
  const mainWin = await getMainWindow();
  // 监听窗口关闭请求
  mainWin.onCloseRequested(async (event: CloseRequestedEvent) => {
    // 阻止默认关闭行为
    event.preventDefault();

    try {
      // 获取是否最小化到托盘的设置
      const minimizeToTray = await getSetting<boolean>(
        "system.minimizeToTray",
        true
      );

      if (minimizeToTray) {
        // 如果开启了最小化到托盘，则隐藏窗口
        console.log("已启用最小化到托盘，隐藏窗口");
        await hideWindow();
      } else {
        // 否则退出应用
        console.log("未启用最小化到托盘，退出应用");
        await exitApp();
      }
    } catch (error) {
      console.error("处理窗口关闭事件时出错:", error);
    }
  });

  console.log("窗口关闭事件处理器已设置");
}

/**
 * 显示窗口并设置焦点
 */
export async function showWindow(): Promise<void> {
  try {
    const mainWin = await getMainWindow();
    await mainWin.show();
    await mainWin.setFocus();
  } catch (error) {
    console.error("显示窗口时出错:", error);
  }
}

/**
 * 隐藏窗口
 */
export async function hideWindow(): Promise<void> {
  try {
    const mainWin = await getMainWindow();
    await mainWin.hide();
  } catch (error) {
    console.error("隐藏窗口时出错:", error);
  }
}

/**
 * 退出应用程序
 */
export async function exitApp(): Promise<void> {
  try {
    await exit(0);
  } catch (error) {
    console.error("退出应用时出错:", error);
  }
}

export async function getMainWindow(): Promise<Window> {
  const window = await Window.getByLabel("main");
  if (!window) {
    throw new Error("主窗口未找到");
  }
  return window;
}
