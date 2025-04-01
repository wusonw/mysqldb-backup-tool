import { createApp } from "vue";
import App from "./App.vue";
import vuetify from "./plugins/vuetify";
import { createPinia } from "pinia";
import { initStore } from "./utils/store";
import { usePiniaStore } from "./stores/store";
import { setupWindowCloseHandler } from "./utils/window";

// 导入自定义样式
import "./assets/styles";

// 创建Pinia实例
const pinia = createPinia();

// 初始化存储
initStore();

// 创建Vue应用
createApp(App).use(vuetify).use(pinia).mount("#app");

async function init() {
  // 初始化状态
  const store = usePiniaStore();
  await store.initializeSettings();
  await store.checkConnectionStatus();
  await store.getSystemTray();
  await setupWindowCloseHandler();

  store.startConnectionMonitor();
  store.startBackupMonitor();
}

init();

// 禁用右键菜单 - 仅在生产环境中生效
// 在开发环境中保留右键功能便于调试
if (import.meta.env.PROD) {
  console.log("生产环境，禁用右键菜单");
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    return false;
  });
}
