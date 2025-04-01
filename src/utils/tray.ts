import { Menu } from "@tauri-apps/api/menu";
import { TrayIcon } from "@tauri-apps/api/tray";
import { exitApp, showWindow } from "./window";

export async function setSystemTray() {
  const tray = await TrayIcon.getById("main-tray");

  if (tray) {
    const menu = await Menu.new({
      items: [
        {
          id: "show-main-window",
          text: "显示主窗口",
          action: showWindow,
        },
        {
          id: "exit-app",
          text: "关闭应用",
          action: exitApp,
        },
      ],
    });
    await tray.setMenu(menu);
  }
}
