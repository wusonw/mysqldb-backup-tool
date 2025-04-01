import { TrayIcon } from "@tauri-apps/api/tray";
import { exitApp, showWindow } from "./window";
import { Menu } from "@tauri-apps/api/menu";

export async function initTray(): Promise<TrayIcon> {
  try {
    // 创建托盘图标
    const tray = await TrayIcon.new({
      id: "main-tray",
      icon: "icons/128x128.png",
      tooltip: "MySQL数据库备份工具",
      menu: await Menu.new({
        id: "main-tray-menu",
        items: [
          {
            id: "show",
            text: "显示主窗口",
            action: showWindow,
          },
          {
            id: "quit",
            text: "退出",
            action: exitApp,
          },
        ],
      }),
    });

    console.log("系统托盘创建成功");
    return tray;
  } catch (error) {
    console.error("创建系统托盘失败:", error);
    throw error;
  }
}
