import { createApp } from "vue";
import App from "./App.vue";
import vuetify from "./plugins/vuetify";
import { createPinia } from "pinia";
import { initStore } from "./utils/store";

// 导入自定义样式
import "./assets/styles";

// 创建Pinia实例
const pinia = createPinia();

// 初始化存储
initStore().catch((error) => {
  console.error("存储初始化失败:", error);
});

createApp(App).use(vuetify).use(pinia).mount("#app");
