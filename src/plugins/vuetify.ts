import { createVuetify } from "vuetify";
import "vuetify/styles";
import * as components from "vuetify/components";
import { VNumberInput } from "vuetify/labs/VNumberInput";
import * as directives from "vuetify/directives";
import "@mdi/font/css/materialdesignicons.css";

// Vuetify 实例配置
export default createVuetify({
  components: {
    ...components,
    VNumberInput,
  },
  directives,
  theme: {
    defaultTheme: "light",
    themes: {
      light: {
        colors: {
          primary: "#1867C0",
          secondary: "#5CBBF6",
        },
      },
      dark: {
        colors: {
          primary: "#1867C0",
          secondary: "#5CBBF6",
        },
      },
    },
  },
  defaults: {
    VNumberInput: {
      controlVariant: "stacked",
    },
    VSwitch: {
      inset: true,
      trueIcon: "mdi-check",
      falseIcon: "mdi-circle-outline",
    },
    VTabs: {
      density: "comfortable",
      VTab: {
        ripple: false,
      },
    },
    VBtn: {
      flat: true,
    },
  },
});
