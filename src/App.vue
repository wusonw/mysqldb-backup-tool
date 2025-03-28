<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import Settings from "./components/Settings.vue";
import { saveSetting, getSetting } from "./utils/database";
import { open } from "@tauri-apps/plugin-shell";

// 状态变量
const isConnected = ref(false);
const isBackingUp = ref(false);
const backupStatus = ref("点击按钮开始备份");
const lastBackupTime = ref("");
const showSettings = ref(false);
const backupProgress = ref(0); // 备份进度百分比
const backupSettings = reactive({
  path: "",
  auto: false,
  frequency: "daily",
  keepCount: 5,
});

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

// 生成唯一的备份文件名
function generateBackupFileName(): string {
  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, "-").split("T")[0];
  const timeStr = now
    .toISOString()
    .replace(/[:.]/g, "-")
    .split("T")[1]
    .split(".")[0];
  return `mysql_backup_${dateStr}_${timeStr}.sql`;
}

// 生成完整的备份文件路径
function getBackupFilePath(): string {
  if (!backupSettings.path) return "";

  const fileName = generateBackupFileName();
  // 确保路径使用正确的分隔符
  const normalizedPath = backupSettings.path.replace(/\\/g, "/");
  return `${normalizedPath}/${fileName}`;
}

// 模拟备份进度更新
function updateBackupProgress(percent: number) {
  backupProgress.value = percent;
  backupStatus.value = `备份中... ${percent}%`;
}

// 打开备份路径文件夹
async function openBackupFolder() {
  try {
    if (!backupSettings.path) {
      showSnackbar("未设置备份路径", "error");
      return;
    }

    console.log("尝试打开路径:", backupSettings.path);

    // 直接使用原始路径
    await open(backupSettings.path);
  } catch (error) {
    console.error("打开文件夹失败:", error);
    showSnackbar(`打开文件夹失败: ${error}`, "error");
  }
}

// 方法：开始备份
async function startBackup() {
  if (!isConnected.value || isBackingUp.value) return;

  // 检查是否设置了备份路径
  if (!backupSettings.path) {
    showSnackbar("请先在设置中选择备份路径", "error");
    return;
  }

  try {
    // 重置状态
    isBackingUp.value = true;
    backupProgress.value = 0;
    backupStatus.value = "正在准备备份...";

    // 生成备份文件路径
    const backupFilePath = getBackupFilePath();
    console.log(`备份文件将保存到: ${backupFilePath}`);

    // 在生产环境中，这里应该调用Tauri的API进行真实的MySQL备份
    // 现在模拟备份过程
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      updateBackupProgress(i);
    }

    backupStatus.value = "备份完成";
    backupProgress.value = 100;
    lastBackupTime.value = new Date().toLocaleString();

    // 保存最后备份时间到数据库
    await saveSetting("lastBackupTime", lastBackupTime.value);

    showSnackbar(`数据库备份成功，已保存到:\n${backupFilePath}`, "success");
  } catch (error) {
    backupStatus.value = "备份出错";
    backupProgress.value = 0;
    showSnackbar(`备份错误: ${error}`, "error");
  } finally {
    isBackingUp.value = false;
  }
}

// 是否显示备份进度
const showProgress = computed(() => {
  return (
    isBackingUp.value && backupProgress.value > 0 && backupProgress.value < 100
  );
});

// 初始化
onMounted(async () => {
  try {
    // 从数据库加载最后备份时间
    const savedLastBackupTime = await getSetting<string>("lastBackupTime", "");
    if (savedLastBackupTime) {
      lastBackupTime.value = savedLastBackupTime;
    }

    // 加载备份设置
    backupSettings.path = await getSetting<string>("backup.path", "");
    backupSettings.auto = await getSetting<boolean>("backup.auto", false);
    backupSettings.frequency = await getSetting<string>(
      "backup.frequency",
      "daily"
    );
    backupSettings.keepCount = await getSetting<number>("backup.keepCount", 5);

    console.log("已加载备份设置:", backupSettings);
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

        <!-- 备份进度条 -->
        <v-progress-linear
          v-if="showProgress"
          :model-value="backupProgress"
          color="primary"
          height="10"
          rounded
          class="mb-3 w-75"
        ></v-progress-linear>

        <div class="text-h5 mt-4">{{ backupStatus }}</div>
        <div v-if="lastBackupTime" class="text-subtitle-1 mt-2">
          上次备份时间: {{ lastBackupTime }}
        </div>

        <div
          v-if="backupSettings.path"
          class="text-caption mt-1 text-grey d-flex align-center"
        >
          备份路径: {{ backupSettings.path }}
          <!-- 打开按钮 -->
          <v-btn
            class="ml-2"
            :ripple="false"
            size="small"
            variant="text"
            density="comfortable"
            color="primary"
            icon="mdi-folder-open"
            @click="openBackupFolder"
            title="定位备份文件夹"
          ></v-btn>
        </div>
        <div v-else class="text-caption mt-1 text-error">
          未设置备份路径，请在设置中选择
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
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="5000">
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
