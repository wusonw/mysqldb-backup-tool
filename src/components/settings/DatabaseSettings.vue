<script setup lang="ts">
import { ref } from "vue";
import { useStore } from "../../stores/store";

// 使用Pinia Store
const store = useStore();

// 本地状态 - 只用于UI交互
const showPassword = ref(false); // 密码显示状态

// 切换密码显示状态
function togglePasswordVisibility() {
  showPassword.value = !showPassword.value;
}
</script>

<template>
  <v-form class="mt-2">
    <v-text-field
      v-model="store.database.host"
      label="主机地址"
      placeholder="localhost"
      variant="outlined"
      hide-details="auto"
      class="mb-3"
      @update:model-value="store.saveDatabaseSettings"
    ></v-text-field>

    <v-number-input
      v-model.number="store.database.port"
      label="端口"
      placeholder="3306"
      variant="outlined"
      hide-details="auto"
      class="mb-3"
      type="number"
      :min="1"
      :max="65535"
      @update:model-value="store.saveDatabaseSettings"
    ></v-number-input>

    <v-text-field
      v-model="store.database.username"
      label="用户名"
      variant="outlined"
      hide-details="auto"
      class="mb-3"
      @update:model-value="store.saveDatabaseSettings"
    ></v-text-field>

    <v-text-field
      v-model="store.database.password"
      label="密码"
      :type="showPassword ? 'text' : 'password'"
      variant="outlined"
      hide-details="auto"
      class="mb-3 flex-grow-1"
      :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
      @click:append-inner="togglePasswordVisibility"
      @update:model-value="store.saveDatabaseSettings"
    ></v-text-field>

    <v-text-field
      v-model="store.database.database"
      label="数据库名称"
      variant="outlined"
      hide-details="auto"
      class="mb-3"
      @update:model-value="store.saveDatabaseSettings"
    ></v-text-field>

    <v-btn
      color="primary"
      size="large"
      class="border"
      block
      @click="store.testConnection"
      :loading="store.database.isLoading"
    >
      测试连接
    </v-btn>
  </v-form>
</template>
