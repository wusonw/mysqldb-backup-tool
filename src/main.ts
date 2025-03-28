import { createApp } from "vue";
import App from "./App.vue";
import vuetify from "./plugins/vuetify";

// 导入自定义样式
import "./assets/styles";

createApp(App).use(vuetify).mount("#app");
