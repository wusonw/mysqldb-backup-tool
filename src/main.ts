import { createApp } from "vue";
import App from "./App.vue";
import vuetify from "./plugins/vuetify";
import { createPinia } from "pinia";

// 导入自定义样式
import "./assets/styles";

// 创建Pinia实例
const pinia = createPinia();

// 创建Vue应用
createApp(App).use(vuetify).use(pinia).mount("#app");

// 禁用右键菜单 - 仅在生产环境中生效
// 在开发环境中保留右键功能便于调试
// 禁用CTRL+R刷新页面
if (import.meta.env.PROD) {
  console.log("生产环境，禁用右键菜单");
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    return false;
  });
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "r") {
      e.preventDefault();
      return false;
    }
  });
}
