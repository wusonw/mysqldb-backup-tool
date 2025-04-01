<script setup lang="ts">
import { ref, reactive } from "vue";
import { usePiniaStore } from "../../stores/store";
import Database from "@tauri-apps/plugin-sql";

// 使用Pinia Store
const store = usePiniaStore();

// 本地表单数据
const formData = reactive({
  host: store.database.host,
  port: store.database.port,
  username: store.database.username,
  password: store.database.password,
  database: store.database.database,
});

// 本地状态 - 只用于UI交互
const showPassword = ref(false); // 密码显示状态
const isLoading = ref(false); // 加载状态

// 切换密码显示状态
function togglePasswordVisibility() {
  showPassword.value = !showPassword.value;
}

// 保存数据库配置
async function saveConfig() {
  // 显示保存中状态
  isLoading.value = true;

  try {
    // 更新store中的配置
    store.database.host = formData.host;
    store.database.port = formData.port;
    store.database.username = formData.username;
    store.database.password = formData.password;
    store.database.database = formData.database;

    // 保存配置到存储中
    await store.saveDatabaseSettings();

    // 完全重置数据库连接状态
    store.database.isConnected = false;
    store.database.dbServer = null;

    // 停止当前的连接监控
    store.stopConnectionMonitor();

    // 直接使用配置进行独立测试，不依赖于store的状态检查函数
    let connected = false;

    try {
      const pass = encodeURIComponent(formData.password);
      // 构建连接字符串
      const connServer = `mysql://${formData.username}:${pass}@${formData.host}:${formData.port}/information_schema`;
      console.log(
        `保存后测试连接: ${connServer.replace(/:[^:]*@/, ":******@")}`
      );

      let dbServer = null;
      try {
        // 尝试连接到服务器
        dbServer = await Database.load(connServer);

        // 检查数据库是否存在
        const checkQuery = `SELECT count(*) as count FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = '${formData.database}'`;
        const checkResult = await dbServer.select<Array<{ count: number }>>(
          checkQuery
        );

        // 确认数据库是否存在
        connected = checkResult.length === 1 && checkResult[0].count === 1;

        // 更新全局连接状态
        store.database.isConnected = connected;
      } finally {
        // 关闭测试连接
        if (dbServer) {
          try {
            await dbServer.close();
          } catch (e) {
            console.error("关闭测试连接失败:", e);
          }
        }
      }

      // 重启连接监控
      store.startConnectionMonitor();

      // 根据测试结果显示消息
      if (connected) {
        store.showSnackbar("数据库配置已保存并连接成功", "success");
      } else {
        store.showSnackbar("数据库配置已保存，但连接测试失败", "warning");
      }
    } catch (error) {
      console.error("保存后连接测试失败:", error);
      store.showSnackbar(`配置已保存，但连接测试失败: ${error}`, "warning");

      // 重启连接监控
      store.startConnectionMonitor();
    }
  } catch (error) {
    console.error("保存配置失败:", error);
    store.showSnackbar("保存配置出错: " + error, "error");
  } finally {
    isLoading.value = false;
  }
}

// 独立测试表单中的连接参数，不影响全局状态
async function testFormConnection() {
  if (!formData.database) {
    store.showSnackbar("请输入数据库名称", "error");
    return;
  }

  isLoading.value = true;

  try {
    const pass = encodeURIComponent(formData.password);

    // 构建连接字符串
    const connServer = `mysql://${formData.username}:${pass}@${formData.host}:${formData.port}/information_schema`;
    console.log(`尝试测试连接: ${connServer.replace(/:[^:]*@/, ":******@")}`);

    let dbServer = null;

    try {
      // 尝试连接到服务器
      dbServer = await Database.load(connServer);

      // 检查数据库是否存在
      const checkQuery = `SELECT count(*) as count FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = '${formData.database}'`;
      const checkResult = await dbServer.select<Array<{ count: number }>>(
        checkQuery
      );

      // 确认数据库是否存在
      const dbExists = checkResult.length === 1 && checkResult[0].count === 1;

      if (dbExists) {
        store.showSnackbar("数据库连接成功", "success");
      } else {
        store.showSnackbar(`数据库 '${formData.database}' 不存在`, "error");
      }
    } catch (error) {
      store.showSnackbar(
        `连接失败: ${error instanceof Error ? error.message : String(error)}`,
        "error"
      );
    } finally {
      // 关闭连接
      if (dbServer) {
        try {
          await dbServer.close();
        } catch (e) {
          console.error("关闭数据库连接失败:", e);
        }
      }
    }
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <v-form class="mt-2">
    <v-text-field
      v-model="formData.host"
      label="主机地址"
      placeholder="localhost"
      variant="outlined"
      hide-details="auto"
      class="mb-3"
    ></v-text-field>

    <v-number-input
      v-model.number="formData.port"
      label="端口"
      placeholder="3306"
      variant="outlined"
      hide-details="auto"
      class="mb-3"
      type="number"
      :min="1"
      :max="65535"
    ></v-number-input>

    <v-text-field
      v-model="formData.username"
      label="用户名"
      variant="outlined"
      hide-details="auto"
      class="mb-3"
    ></v-text-field>

    <v-text-field
      v-model="formData.password"
      label="密码"
      :type="showPassword ? 'text' : 'password'"
      variant="outlined"
      hide-details="auto"
      class="mb-3 flex-grow-1"
      :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
      @click:append-inner="togglePasswordVisibility"
    ></v-text-field>

    <v-text-field
      v-model="formData.database"
      label="数据库名称"
      variant="outlined"
      hide-details="auto"
      class="mb-3"
    ></v-text-field>

    <div class="d-flex flex-column gap-2">
      <v-btn
        color="info"
        size="large"
        class="border mb-3"
        block
        @click="testFormConnection"
        :loading="isLoading"
      >
        测试连接
      </v-btn>

      <v-btn
        color="primary"
        size="large"
        class="border"
        block
        @click="saveConfig"
      >
        保存配置
      </v-btn>
    </div>
  </v-form>
</template>
