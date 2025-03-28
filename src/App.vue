<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import Settings from "./components/Settings.vue";
import { saveSetting, getSetting } from "./utils/database";
// import { open } from "@tauri-apps/api/dialog";
// import { invoke } from "@tauri-apps/api/core";

// 状态变量
const isConnected = ref(false);
const isBackingUp = ref(false);
const backupStatus = ref("点击按钮开始备份");
const lastBackupTime = ref("");
const showSettings = ref(false);

// 提示框状态
const snackbar = reactive({
  show: false,
  text: "",
  color: "info",
});

// 方法：显示提示
function showSnackbar(text: string, color: string = "info") {
  snackbar.text = text;
  snackbar.color = color;
  snackbar.show = true;
}

// 方法：测试数据库连接状态更新
function updateConnectionStatus(status: boolean) {
  isConnected.value = status;
}

// 方法：开始备份
async function startBackup() {
  if (!isConnected.value || isBackingUp.value) return;

  try {
    isBackingUp.value = true;
    backupStatus.value = "正在备份...";

    // 模拟备份过程
    await new Promise((resolve) => setTimeout(resolve, 2000));

    backupStatus.value = "备份完成";
    lastBackupTime.value = new Date().toLocaleString();

    // 保存最后备份时间到数据库
    await saveSetting("lastBackupTime", lastBackupTime.value);

    showSnackbar("数据库备份成功", "success");
  } catch (error) {
    backupStatus.value = "备份出错";
    showSnackbar(`备份错误: ${error}`, "error");
  } finally {
    isBackingUp.value = false;
  }
}

// 初始化
onMounted(async () => {
  try {
    // 从数据库加载最后备份时间
    const savedLastBackupTime = await getSetting<string>("lastBackupTime", "");
    if (savedLastBackupTime) {
      lastBackupTime.value = savedLastBackupTime;
    }
  } catch (error) {
    console.error("加载设置失败:", error);
  }
});
</script>

<template>
  <v-app>
    <v-main class="main-content">
      <v-container
        class="d-flex flex-column align-center justify-center main-container pa-0"
      >
        <!-- 右上角状态和设置 -->
        <div class="status-bar">
          <!-- 数据库连接状态显示 -->
          <v-chip
            class="mr-3"
            :color="isConnected ? 'success' : 'error'"
            text-color="white"
            size="large"
          >
            {{ isConnected ? "数据库已连接" : "数据库未连接" }}
          </v-chip>
          <v-spacer />
          <!-- 设置按钮 -->
          <v-btn icon @click="showSettings = true">
            <v-icon>mdi-cog</v-icon>
          </v-btn>
        </div>

        <!-- 圆形备份按钮 -->
        <v-tooltip text="开始备份">
          <template v-slot:activator="{ props }">
            <v-btn
              v-bind="props"
              color="primary"
              icon="mdi-database-export"
              size="x-large"
              elevation="8"
              rounded="circle"
              width="160"
              height="160"
              class="backup-btn mb-5"
              :loading="isBackingUp"
              :disabled="!isConnected || isBackingUp"
              @click="startBackup"
            >
              <v-icon size="64"></v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <div class="text-h5 mt-4">{{ backupStatus }}</div>
        <div v-if="lastBackupTime" class="text-subtitle-1 mt-2">
          上次备份时间: {{ lastBackupTime }}
        </div>
      </v-container>
    </v-main>

    <!-- 设置组件 -->
    <Settings
      v-model="showSettings"
      @status-update="showSnackbar"
      @connection-change="updateConnectionStatus"
    />

    <!-- 提示框 -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color">
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false"> 关闭 </v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<style>
/* 添加到 components.css 中 */
.status-bar {
  display: flex;
  align-items: center;
  z-index: 1;
  width: 100%;
  padding: 0 16px;
  position: absolute;
  top: 16px;
}

/* 设置按钮样式优化 */
.status-bar .v-btn--icon {
  margin-left: 8px;
  background-color: rgba(var(--v-theme-surface-variant), 0.1);
}

/* 将这些样式移动到 components.css */
.backup-btn {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.backup-btn:not(.v-btn--disabled):hover {
  transform: scale(1.05);
}

.backup-btn .v-icon {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.backup-btn:active:not(.v-btn--disabled) .v-icon {
  transform: scale(0.95);
}

.backup-btn.v-btn--loading .v-icon {
  opacity: 0;
}
</style>
