<script setup lang="ts">
import { computed, watch, onMounted } from "vue";
import Settings from "./components/Settings.vue";
import { usePiniaStore } from "./stores/store";
import { useTheme } from "vuetify";
import { initStore } from "./utils/store";
import { getMainWindow, setupWindowCloseHandler } from "./utils/window";
import { setSystemTray } from "./utils/tray";

// 使用Vuetify主题
const theme = useTheme();

// 计算属性：是否显示备份进度
const showProgress = computed(() => store.showProgress);

const store = usePiniaStore();

async function init() {
  // 初始化存储
  await initStore();
  await store.initializeSettings();
  await store.checkConnectionStatus();
  await setupWindowCloseHandler();
  await setSystemTray();

  store.startConnectionMonitor();
  store.startBackupMonitor();
}

onMounted(init);

async function setTheme(isDarkMode: boolean) {
  const mainWindow = await getMainWindow();
  await mainWindow.setTheme(isDarkMode ? "dark" : "light");
  theme.global.name.value = isDarkMode ? "dark" : "light";
}

// 监听深色模式变化，实时应用主题
watch(
  () => store.system.darkMode,
  async (isDarkMode) => {
    await setTheme(isDarkMode);
  }
);
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
            :color="store.database.isConnected ? 'success' : 'error'"
            text-color="white"
            size="large"
          >
            {{ store.database.isConnected ? "数据库已连接" : "数据库未连接" }}
          </v-chip>
          <v-spacer />
          <!-- 设置按钮 -->
          <v-btn icon @click="store.toggleSettings(true)">
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
              :loading="store.backup.isBackingUp"
              :disabled="
                !store.database.isConnected || store.backup.isBackingUp
              "
              @click="store.startBackup"
            >
              <v-icon size="64"></v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <!-- 备份进度条 -->
        <v-fade-transition>
          <v-progress-linear
            v-if="showProgress"
            :model-value="store.backup.backupProgress"
            color="primary"
            height="10"
            rounded
            class="mb-3 w-75"
            :buffer-value="Math.min(store.backup.backupProgress + 15, 100)"
            :stream="store.backup.backupProgress < 90"
          ></v-progress-linear>
        </v-fade-transition>

        <div class="text-h5 mt-4">{{ store.backup.backupStatus }}</div>

        <!-- 当前正在备份的表名，只在备份中且有表名时显示 -->
        <v-fade-transition>
          <div
            v-if="showProgress && store.backup.currentTableName"
            class="text-caption text-grey-darken-1 mt-1"
            style="font-size: 11px; letter-spacing: -0.2px"
          >
            正在备份：{{ store.backup.currentTableName }}
            {{
              store.backup.backupStatus.includes("行")
                ? " - " + store.backup.backupStatus.match(/\(([^)]+)\)/)?.[1]
                : ""
            }}
          </div>
        </v-fade-transition>

        <div v-if="store.backup.lastBackupTime" class="text-subtitle-1 mt-2">
          上次备份时间: {{ store.backup.lastBackupTime }}
        </div>

        <div
          v-if="store.backup.path"
          class="text-caption mt-1 text-grey d-flex align-center"
        >
          备份路径: {{ store.backup.path }}
          <!-- 打开按钮 -->
          <v-btn
            class="ml-2"
            :ripple="false"
            size="small"
            variant="text"
            density="comfortable"
            color="primary"
            icon="mdi-folder-open"
            @click="store.openBackupFolder"
            title="定位备份文件夹"
          ></v-btn>
        </div>
        <div v-else class="text-caption mt-1 text-error">
          未设置备份路径，请在设置中选择
        </div>
      </v-container>
    </v-main>

    <!-- 设置组件 -->
    <Settings v-model="store.ui.showSettings" />

    <!-- 提示框 -->
    <v-snackbar
      v-model="store.ui.snackbar.show"
      :color="store.ui.snackbar.color"
      timeout="5000"
    >
      {{ store.ui.snackbar.text }}
      <template v-slot:actions>
        <v-btn variant="text" @click="store.ui.snackbar.show = false">
          关闭
        </v-btn>
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
