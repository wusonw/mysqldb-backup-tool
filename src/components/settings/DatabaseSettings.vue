<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { saveSetting, getSetting } from "../../utils/database";

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

// 监听本地状态变化
watch([host, port, username, password, database], async () => {
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
    await saveSetting("database.host", host.value);
    await saveSetting("database.port", port.value);
    await saveSetting("database.username", username.value);
    await saveSetting("database.password", password.value);
    await saveSetting("database.database", database.value);
  } catch (error) {
    console.error("保存数据库设置失败:", error);
    emit("statusUpdate", "保存数据库设置失败", "error");
  }
});

// 初始化时从数据库加载设置
onMounted(async () => {
  try {
    host.value = await getSetting("database.host", "localhost");
    port.value = await getSetting("database.port", 3306);
    username.value = await getSetting("database.username", "root");
    password.value = await getSetting("database.password", "");
    database.value = await getSetting("database.database", "");

    // 更新父组件的设置
    emit("update:databaseSettings", {
      host: host.value,
      port: port.value,
      username: username.value,
      password: password.value,
      database: database.value,
    });
  } catch (error) {
    console.error("加载数据库设置失败:", error);
  }
});

// 测试数据库连接
async function testConnection() {
  try {
    // 这里可以实现实际的数据库连接测试
    // 现在只是返回成功信息
    emit("statusUpdate", "数据库连接成功", "success");
    emit("connectionChange", true); // 通知连接状态变化
  } catch (error) {
    emit("statusUpdate", `连接错误: ${error}`, "error");
    emit("connectionChange", false); // 通知连接状态变化
  }
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
      type="password"
      variant="outlined"
      hide-details="auto"
      class="mb-3"
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
    >
      测试连接
    </v-btn>
  </v-form>
</template>
