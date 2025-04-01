import { createApp } from "vue";
import App from "./App.vue";
import vuetify from "./plugins/vuetify";
import { createPinia } from "pinia";
import { initStore } from "./utils/store";
import { useStore } from "./stores/store";
import { setupWindowCloseHandler } from "./utils/window";
import { initTray } from "./utils/tray";

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

// 设置窗口关闭事件处理器
setupWindowCloseHandler().catch((error) => {
  console.error("设置窗口关闭事件处理器失败:", error);
});

// 初始化系统托盘
initTray().catch((error) => {
  console.error("初始化系统托盘失败:", error);
});
