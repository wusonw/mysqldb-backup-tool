<script setup lang="ts">
import { ref, reactive, computed } from "vue";
import DatabaseSettings from "./settings/DatabaseSettings.vue";
import BackupSettings from "./settings/BackupSettings.vue";
import SystemSettings from "./settings/SystemSettings.vue";

// 定义props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

// 定义emit
const emit = defineEmits([
  "update:modelValue",
  "statusUpdate",
  "connectionChange",
]);

// 设置选项
const settings = reactive({
  database: {
    host: "localhost",
    port: 3306,
    username: "root",
    password: "",
    database: "",
  },
  backup: {
    path: "",
    auto: false,
    frequency: "daily",
    keepCount: 5,
  },
  system: {
    darkMode: false,
    autoStart: false,
    minimizeToTray: true,
  },
});

// 备份频率选项
const backupFrequencies = [
  { title: "每天", value: "daily" },
  { title: "每周", value: "weekly" },
  { title: "每月", value: "monthly" },
  { title: "自定义（小时）", value: "custom" },
];

// 活动选项卡
const activeTab = ref("database");

// 显示提示消息
function showStatus(text: string, color: string = "info") {
  emit("statusUpdate", text, color);
}

// 设置的 v-model 处理
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value),
});

// 数据库连接状态变更
function handleConnectionChange(isConnected: boolean) {
  emit("connectionChange", isConnected);
}
</script>

<template>
  <v-dialog v-model="dialogVisible" width="600">
    <v-card>
      <v-card-title>
        <v-tabs v-model="activeTab">
          <v-tab value="database">数据库配置</v-tab>
          <v-tab value="backup">备份设置</v-tab>
          <v-tab value="system">系统设置</v-tab>
        </v-tabs>
      </v-card-title>

      <v-card-text>
        <v-window v-model="activeTab">
          <!-- 数据库配置页 -->
          <v-window-item value="database">
            <DatabaseSettings
              v-model:databaseSettings="settings.database"
              @status-update="showStatus"
              @connection-change="handleConnectionChange"
            />
          </v-window-item>

          <!-- 备份设置页 -->
          <v-window-item value="backup">
            <BackupSettings
              v-model:backupSettings="settings.backup"
              :backup-frequencies="backupFrequencies"
              @status-update="showStatus"
            />
          </v-window-item>

          <!-- 系统设置页 -->
          <v-window-item value="system">
            <SystemSettings
              v-model:systemSettings="settings.system"
              @status-update="showStatus"
            />
          </v-window-item>
        </v-window>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
