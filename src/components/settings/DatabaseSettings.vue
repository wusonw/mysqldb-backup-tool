<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { saveSetting, getSetting } from "../../utils/database";
import Database from "@tauri-apps/plugin-sql";

// 定义props
const props = defineProps({
  databaseSettings: {
    type: Object,
    required: true,
  },
});

// 定义emit
const emit = defineEmits([
  "update:databaseSettings",
  "statusUpdate",
  "connectionChange",
]);

// 本地状态
const host = ref(props.databaseSettings.host || "localhost");
const port = ref(props.databaseSettings.port || 3306);
const username = ref(props.databaseSettings.username || "root");
const password = ref(props.databaseSettings.password || "");
const database = ref(props.databaseSettings.database || "");
const showPassword = ref(false); // 密码显示状态
const isLoading = ref(false); // 添加加载状态
const settingsSaveDisabled = ref(false); // 添加设置保存禁用标志

// 监听本地状态变化
watch([host, port, username, password, database], async () => {
  // 如果设置保存被禁用，则不执行保存操作
  if (settingsSaveDisabled.value) {
    console.log("设置保存当前已禁用，跳过保存操作");
    return;
  }

  // 更新父组件的设置
  emit("update:databaseSettings", {
    host: host.value,
    port: port.value,
    username: username.value,
    password: password.value,
    database: database.value,
  });

  // 保存到数据库
  try {
    console.log("开始保存数据库设置...");
    await saveSetting("database.host", host.value);
    await saveSetting("database.port", port.value);
    await saveSetting("database.username", username.value);

    // 特别处理密码保存
    console.log("准备保存密码:", password.value);
    await saveSetting("database.password", password.value);
    console.log("密码已保存");

    await saveSetting("database.database", database.value);

    console.log("数据库设置已保存");
  } catch (error) {
    console.error("保存数据库设置失败:", error);
    emit("statusUpdate", "保存数据库设置失败", "error");
  }
});

// 初始化时从数据库加载设置
onMounted(async () => {
  try {
    console.log("从数据库加载设置...");

    // 依次加载各个设置项
    host.value = await getSetting("database.host", "localhost");
    port.value = await getSetting("database.port", 3306);
    username.value = await getSetting("database.username", "root");

    // 特别处理密码
    console.log("正在加载密码...");
    const savedPassword = await getSetting("database.password", "");
    console.log("加载到的原始密码:", savedPassword);
    password.value = savedPassword;
    console.log("密码设置完成，当前密码值:", password.value);

    database.value = await getSetting("database.database", "");

    console.log("数据库设置加载完成");

    // 更新父组件的设置
    emit("update:databaseSettings", {
      host: host.value,
      port: port.value,
      username: username.value,
      password: password.value,
      database: database.value,
    });

    console.log("已更新父组件设置");
  } catch (error) {
    console.error("加载数据库设置失败:", error);
  }
});

// 测试数据库连接
async function testConnection() {
  isLoading.value = true;
  // 在测试连接期间禁用设置保存，避免在连接池关闭时尝试保存
  settingsSaveDisabled.value = true;

  try {
    console.log("开始测试MySQL数据库连接...");

    if (!database.value) {
      emit("statusUpdate", "请输入数据库名称", "error");
      emit("connectionChange", false);
      isLoading.value = false;
      return;
    }

    const pass = encodeURIComponent(password.value);

    // 先连接到MySQL的系统数据库information_schema
    const connServer = `mysql://${username.value}:${pass}@${host.value}:${port.value}/information_schema`;
    console.log(
      `尝试连接MySQL服务器: ${connServer.replace(/:[^:]*@/, ":******@")}`
    );

    try {
      // 连接到服务器
      const serverDb = await Database.load(connServer);

      // 尝试使用不同的查询方式检查数据库是否存在
      // 直接将数据库名嵌入查询中，避免参数化查询的问题
      const checkQuery = `SELECT count(*) as count FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = '${database.value}'`;
      const checkResult = await serverDb.select<Array<{ count: number }>>(
        checkQuery
      );
      console.log("数据库检查结果:", JSON.stringify(checkResult, null, 2));

      if (checkResult.length !== 1 || checkResult[0].count !== 1) {
        emit("statusUpdate", `数据库 '${database.value}' 不存在`, "error");
        emit("connectionChange", false);
        isLoading.value = false;
      } else {
        emit("statusUpdate", "数据库连接成功", "success");
        emit("connectionChange", true);
      }
    } catch (serverError) {
      console.error("MySQL服务器连接失败:", serverError);
      const errorMessage =
        serverError instanceof Error
          ? serverError.message
          : String(serverError);
      emit("statusUpdate", `连接MySQL服务器错误: ${errorMessage}`, "error");
      emit("connectionChange", false);
      isLoading.value = false;
      return;
    }
  } catch (error) {
    console.error("MySQL连接测试失败:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    emit("statusUpdate", `连接错误: ${errorMessage}`, "error");
    emit("connectionChange", false);
  } finally {
    isLoading.value = false;
    // 测试连接结束后重新启用设置保存
    // 使用setTimeout确保在watch触发后再启用
    setTimeout(() => {
      settingsSaveDisabled.value = false;
      console.log("已重新启用设置保存功能");
    }, 100);
  }
}

// 切换密码显示状态
function togglePasswordVisibility() {
  showPassword.value = !showPassword.value;
}
</script>

<template>
  <v-form class="mt-2">
    <v-text-field
      v-model="host"
      label="主机地址"
      placeholder="localhost"
      variant="outlined"
      hide-details="auto"
      class="mb-3"
    ></v-text-field>

    <v-number-input
      v-model.number="port"
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
      v-model="username"
      label="用户名"
      variant="outlined"
      hide-details="auto"
      class="mb-3"
    ></v-text-field>

    <v-text-field
      v-model="password"
      label="密码"
      :type="showPassword ? 'text' : 'password'"
      variant="outlined"
      hide-details="auto"
      class="mb-3 flex-grow-1"
      :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
      @click:append-inner="togglePasswordVisibility"
    ></v-text-field>

    <v-text-field
      v-model="database"
      label="数据库名称"
      variant="outlined"
      hide-details="auto"
      class="mb-3"
    ></v-text-field>

    <v-btn
      color="primary"
      size="large"
      class="border"
      block
      @click="testConnection"
      :loading="isLoading"
    >
      测试连接
    </v-btn>
  </v-form>
</template>
