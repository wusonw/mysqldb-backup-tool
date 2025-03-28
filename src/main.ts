import { createApp } from "vue";
import App from "./App.vue";
import vuetify from "./plugins/vuetify";
import { initDatabase } from "./utils/database";

// 导入自定义样式
import "./assets/styles";

// 初始化数据库
initDatabase().catch((error) => {
  console.error("数据库初始化失败:", error);
});

createApp(App).use(vuetify).mount("#app");
