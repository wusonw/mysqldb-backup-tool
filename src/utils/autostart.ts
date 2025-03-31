/**
 * 自启动功能实用工具
 * 实现应用程序的开机自启动功能
 */

import { isEnabled, enable, disable } from "@tauri-apps/plugin-autostart";

/**
 * 检查应用是否已设置为自启动
 * @returns 是否已设置为自启动
 */
export async function isAutoStartEnabled(): Promise<boolean> {
  try {
    // 直接调用Tauri的autostart插件API
    const autoStartEnabled = await isEnabled();
    console.log(`检查自启动状态: ${autoStartEnabled}`);
    return autoStartEnabled;
  } catch (error) {
    console.error("检查自启动状态失败:", error);
    return false;
  }
}

/**
 * 启用应用的自启动功能
 * @returns 是否成功启用
 */
export async function enableAutoStart(): Promise<boolean> {
  try {
    // 直接调用Tauri的autostart插件API
    await enable();
    console.log("已启用开机自启动");
    return true;
  } catch (error) {
    console.error("启用自启动失败:", error);
    return false;
  }
}

/**
 * 禁用应用的自启动功能
 * @returns 是否成功禁用
 */
export async function disableAutoStart(): Promise<boolean> {
  try {
    // 直接调用Tauri的autostart插件API
    await disable();
    console.log("已禁用开机自启动");
    return true;
  } catch (error) {
    console.error("禁用自启动失败:", error);
    return false;
  }
}
