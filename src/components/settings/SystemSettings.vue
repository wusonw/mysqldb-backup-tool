<script setup lang="ts">
import { useStore } from "../../stores/store";

// 使用Pinia Store
const store = useStore();

// 切换深色模式
const toggleDarkMode = (value: boolean | null) => {
  if (value === null) return;

  // 使用store提供的方法切换主题
  store.toggleDarkMode(value);

  // 显示主题切换通知
  store.showSnackbar(`已切换到${value ? "深色" : "浅色"}模式`, "info");
};
</script>

<template>
  <v-form class="mt-2">
    <v-switch
      v-model="store.system.darkMode"
      label="深色模式"
      color="primary"
      hide-details
      class="mb-3"
      @update:model-value="toggleDarkMode"
    >
      <template v-slot:append>
        <v-icon
          :icon="
            store.system.darkMode ? 'mdi-weather-night' : 'mdi-weather-sunny'
          "
        />
      </template>
    </v-switch>

    <v-switch
      v-model="store.system.autoStart"
      label="开机自启动"
      color="primary"
      hide-details
      class="mb-3"
      @update:model-value="store.saveSystemSettings"
    ></v-switch>

    <v-switch
      v-model="store.system.minimizeToTray"
      label="最小化到托盘"
      color="primary"
      hide-details
      class="mb-3"
      @update:model-value="store.saveSystemSettings"
    ></v-switch>
  </v-form>
</template>
