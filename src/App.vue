<script setup lang="ts">
import { ref, reactive, watch, onMounted } from "vue";
// import { open } from "@tauri-apps/api/dialog";
import { invoke } from "@tauri-apps/api/core";

// 状态变量
const isConnected = ref(false);
const isBackingUp = ref(false);
const backupStatus = ref("点击按钮开始备份");
const lastBackupTime = ref("");
const showSettings = ref(false);
const activeTab = ref("database");

// 备份频率选项
const backupFrequencies = [
  { title: "每天", value: "daily" },
  { title: "每周", value: "weekly" },
  { title: "每月", value: "monthly" },
  { title: "自定义（小时）", value: "custom" },
];

// 设置选项
const settings = reactive({
  database: {
    host: "localhost",
    port: "3306",
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

// 方法：测试数据库连接
async function testConnection() {
  try {
    // 模拟数据库连接测试
    // 实际实现时，将调用后端API
    isConnected.value = true;
    showSnackbar("数据库连接成功", "success");
  } catch (error) {
    isConnected.value = false;
    showSnackbar(`连接错误: ${error}`, "error");
  }
}

// 方法：选择备份路径
const selectBackupPath = async () => {
  try {
    // 模拟选择文件夹
    // 注释掉实际调用，暂时使用模拟数据
    // const selected = await open({
    //   directory: true,
    //   multiple: false,
    //   title: "选择备份保存路径",
    // });

    // 模拟已选择路径
    settings.backup.path = "/用户/文档/数据库备份";
    showSnackbar("已选择备份路径", "success");
  } catch (error) {
    showSnackbar(`选择路径错误: ${error}`, "error");
  }
};

// 方法：保存设置
async function saveSettings() {
  try {
    // 这里只是前端模拟，实际实现需要调用后端API
    showSnackbar("设置已保存", "success");
    showSettings.value = false;
    testConnection();
  } catch (error) {
    showSnackbar(`保存设置失败: ${error}`, "error");
  }
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
    showSnackbar("数据库备份成功", "success");
  } catch (error) {
    backupStatus.value = "备份出错";
    showSnackbar(`备份错误: ${error}`, "error");
  } finally {
    isBackingUp.value = false;
  }
}

// 初始化
onMounted(() => {
  // 初始化设置等
});

// 监听主题变化
watch(
  () => settings.system.darkMode,
  (newValue) => {
    // 切换主题逻辑
  }
);
</script>

<template>
  <v-app>
    <v-app-bar elevation="1" color="primary">
      <v-app-bar-title>MySQL数据库备份工具</v-app-bar-title>
      <v-spacer></v-spacer>

      <!-- 数据库连接状态显示 -->
      <v-chip
        class="mr-3"
        :color="isConnected ? 'success' : 'error'"
        text-color="white"
      >
        {{ isConnected ? "数据库已连接" : "数据库未连接" }}
      </v-chip>

      <!-- 设置按钮 -->
      <v-btn icon @click="showSettings = true">
        <v-icon>mdi-cog</v-icon>
      </v-btn>
    </v-app-bar>

    <v-main>
      <v-container
        class="d-flex flex-column align-center justify-center"
        style="height: 100%"
      >
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
              width="100"
              height="100"
              class="mb-5"
              :loading="isBackingUp"
              :disabled="!isConnected || isBackingUp"
              @click="startBackup"
            >
            </v-btn>
          </template>
        </v-tooltip>

        <div class="text-h5 mt-4">{{ backupStatus }}</div>
        <div v-if="lastBackupTime" class="text-subtitle-1 mt-2">
          上次备份时间: {{ lastBackupTime }}
        </div>
      </v-container>
    </v-main>

    <!-- 设置对话框 -->
    <v-dialog v-model="showSettings" width="600">
      <v-card>
        <v-card-title>
          <span class="text-h5">设置</span>
        </v-card-title>

        <v-card-text>
          <v-tabs v-model="activeTab">
            <v-tab value="database">数据库配置</v-tab>
            <v-tab value="backup">备份设置</v-tab>
            <v-tab value="system">系统设置</v-tab>
          </v-tabs>

          <v-window v-model="activeTab">
            <!-- 数据库配置页 -->
            <v-window-item value="database">
              <v-form class="mt-5">
                <v-text-field
                  v-model="settings.database.host"
                  label="主机地址"
                  placeholder="localhost"
                  variant="outlined"
                  hide-details="auto"
                  class="mb-3"
                ></v-text-field>

                <v-text-field
                  v-model="settings.database.port"
                  label="端口"
                  placeholder="3306"
                  variant="outlined"
                  hide-details="auto"
                  class="mb-3"
                ></v-text-field>

                <v-text-field
                  v-model="settings.database.username"
                  label="用户名"
                  variant="outlined"
                  hide-details="auto"
                  class="mb-3"
                ></v-text-field>

                <v-text-field
                  v-model="settings.database.password"
                  label="密码"
                  type="password"
                  variant="outlined"
                  hide-details="auto"
                  class="mb-3"
                ></v-text-field>

                <v-text-field
                  v-model="settings.database.database"
                  label="数据库名称"
                  variant="outlined"
                  hide-details="auto"
                  class="mb-3"
                ></v-text-field>

                <v-btn color="primary" block @click="testConnection">
                  测试连接
                </v-btn>
              </v-form>
            </v-window-item>

            <!-- 备份设置页 -->
            <v-window-item value="backup">
              <v-form class="mt-5">
                <v-text-field
                  v-model="settings.backup.path"
                  label="备份文件保存路径"
                  variant="outlined"
                  hide-details="auto"
                  class="mb-3"
                  append-inner-icon="mdi-folder"
                  @click:append-inner="selectBackupPath"
                ></v-text-field>

                <v-switch
                  v-model="settings.backup.auto"
                  label="启用自动备份"
                  color="primary"
                  hide-details
                  class="mb-3"
                ></v-switch>

                <v-select
                  v-model="settings.backup.frequency"
                  label="备份频率"
                  :items="backupFrequencies"
                  variant="outlined"
                  hide-details="auto"
                  :disabled="!settings.backup.auto"
                  class="mb-3"
                ></v-select>

                <v-text-field
                  v-model="settings.backup.keepCount"
                  label="保留备份数量"
                  type="number"
                  variant="outlined"
                  hide-details="auto"
                  class="mb-3"
                ></v-text-field>
              </v-form>
            </v-window-item>

            <!-- 系统设置页 -->
            <v-window-item value="system">
              <v-form class="mt-5">
                <v-switch
                  v-model="settings.system.darkMode"
                  label="深色模式"
                  color="primary"
                  hide-details
                  class="mb-3"
                ></v-switch>

                <v-switch
                  v-model="settings.system.autoStart"
                  label="开机自启动"
                  color="primary"
                  hide-details
                  class="mb-3"
                ></v-switch>

                <v-switch
                  v-model="settings.system.minimizeToTray"
                  label="最小化到托盘"
                  color="primary"
                  hide-details
                  class="mb-3"
                ></v-switch>
              </v-form>
            </v-window-item>
          </v-window>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="text" @click="saveSettings">
            保存
          </v-btn>
          <v-btn color="error" variant="text" @click="showSettings = false">
            取消
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 提示框 -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color">
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false"> 关闭 </v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<style scoped>
.v-container {
  min-height: 80vh;
}
</style>
