<script setup lang="ts">
import { usePiniaStore } from "../../stores/store";

// 使用Pinia Store
const store = usePiniaStore();

// 切换深色模式
const toggleDarkMode = (value: boolean | null) => {
  if (value === null) return;

  // 使用store提供的方法切换主题
  store.toggleDarkMode(value);

  // 显示主题切换通知
  store.showSnackbar(`已切换到${value ? "深色" : "浅色"}模式`, "info");
};

// 切换开机自启动
const toggleAutoStart = (value: boolean | null) => {
  if (value === null) return;

  // 使用store提供的方法设置开机自启动
  store.updateAutoStart(value);
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
            store.system.darkMode
              ? 'mdi-moon-waning-crescent'
              : 'mdi-white-balance-sunny'
          "
        />
      </template>
    </v-switch>

    <div class="text-caption text-grey mb-6">
      {{
        store.system.darkMode
          ? "深色模式更适合在夜间使用，减轻眼睛疲劳"
          : "浅色模式适合在日间使用，界面更清晰"
      }}
    </div>

    <v-switch
      v-model="store.system.autoStart"
      label="开机自启动"
      color="primary"
      hide-details
      class="mb-3"
      @update:model-value="toggleAutoStart"
    >
      <template v-slot:append>
        <v-icon
          :color="store.system.autoStart ? 'success' : 'grey'"
          :icon="
            store.system.autoStart ? 'mdi-power-standby' : 'mdi-restart-off'
          "
        />
      </template>
    </v-switch>

    <div class="text-caption text-grey mb-6">
      启用后，系统将在计算机启动时自动启动备份工具
      <v-tooltip location="bottom">
        <template v-slot:activator="{ props }">
          <v-chip v-bind="props" size="x-small" color="success" class="ml-1"
            >系统功能</v-chip
          >
        </template>
        <div class="pa-2">
          <div>自启动由系统直接管理，无需数据库存储</div>
          <div>点击切换将直接修改系统自启动名单</div>
        </div>
      </v-tooltip>
    </div>

    <v-switch
      v-model="store.system.minimizeToTray"
      label="最小化到托盘"
      color="primary"
      hide-details
      class="mb-3"
      @update:model-value="store.saveSystemSettings"
    >
      <template v-slot:append>
        <v-icon
          :color="store.system.minimizeToTray ? 'success' : 'grey'"
          :icon="
            store.system.minimizeToTray
              ? 'mdi-tray-arrow-down'
              : 'mdi-exit-to-app'
          "
        />
      </template>
    </v-switch>

    <div class="text-caption text-grey mb-6">
      启用后，退出时将最小化到系统托盘而不是退出应用
      <v-tooltip location="bottom">
        <template v-slot:activator="{ props }">
          <v-chip v-bind="props" size="x-small" color="success" class="ml-1"
            >系统功能</v-chip
          >
        </template>
        <div class="pa-2">
          <div>如需要开启自动备份功能，建议先开启最小化到托盘功能</div>
        </div>
      </v-tooltip>
    </div>
  </v-form>
</template>
