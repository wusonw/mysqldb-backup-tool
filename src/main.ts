import { createApp } from "vue";
import App from "./App.vue";
import vuetify from "./plugins/vuetify";
import { createPinia } from "pinia";
import { initStore } from "./utils/store";
import { useStore } from "./stores/store";
import { setupWindowCloseHandler } from "./utils/window";

// 导入自定义样式
import "./assets/styles";

// 创建Pinia实例
const pinia = createPinia();

// 初始化存储
initStore().catch((error) => {
  console.error("存储初始化失败:", error);
});

// 创建Vue应用
createApp(App).use(vuetify).use(pinia).mount("#app");

// 初始化状态
const store = useStore();
store.startConnectionMonitor();
store.startBackupMonitor();
store.getSystemTray();

// 设置窗口关闭事件处理器
setupWindowCloseHandler().catch((error) => {
  console.error("设置窗口关闭事件处理器失败:", error);
});

// 禁用右键菜单 - 仅在生产环境中生效
// 在开发环境中保留右键功能便于调试
if (import.meta.env.PROD) {
  console.log("生产环境，禁用右键菜单");
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    return false;
  });
}
