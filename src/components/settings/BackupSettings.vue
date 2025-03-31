<script setup lang="ts">
import { useStore } from "../../stores/store";
import { open } from "@tauri-apps/plugin-dialog";

// 使用Pinia Store
const store = useStore();

// 定义props - 只接收备份频率选项
defineProps({
  backupFrequencies: {
    type: Array,
    required: true,
  },
});

// 选择备份路径
const selectBackupPath = async () => {
  try {
    // 使用Tauri的对话框API选择文件夹
    const selected = await open({
      directory: true,
      multiple: false,
      title: "选择备份保存路径",
    });

    if (selected !== null) {
      // 将选择的路径更新到store
      store.backup.path = selected as string;
      // 保存设置
      store.saveBackupSettings();
      // 显示成功消息
      store.showSnackbar("已选择备份路径", "success");
    }
  } catch (error) {
    console.error("选择路径错误:", error);
    store.showSnackbar(`选择路径错误: ${error}`, "error");
  }
};
</script>

<template>
  <v-form class="mt-2">
    <!-- 备份功能就绪提示 -->
    <v-alert
      type="success"
      class="mb-4"
      variant="tonal"
      icon="mdi-check-circle"
    >
      <div class="d-flex justify-space-between align-center">
        <div>
          <div class="text-subtitle-2 font-weight-bold">备份功能已就绪</div>
          <div class="text-body-2">
            应用内置了MySQL备份功能，无需依赖外部mysqldump工具
          </div>
        </div>
      </div>
    </v-alert>

    <v-text-field
      v-model="store.backup.path"
      label="备份文件保存路径"
      readonly
      variant="outlined"
      hide-details="auto"
      class="mb-3 cursor-pointer"
      append-inner-icon="mdi-folder"
      @click="selectBackupPath"
      @update:model-value="store.saveBackupSettings"
    ></v-text-field>

    <v-switch
      v-model="store.backup.auto"
      label="启用自动备份"
      color="primary"
      hide-details
      class="mb-3"
      @update:model-value="store.saveBackupSettings"
    ></v-switch>

    <v-select
      v-model="store.backup.frequency"
      label="备份频率"
      :items="backupFrequencies"
      variant="outlined"
      hide-details="auto"
      :disabled="!store.backup.auto"
      class="mb-3"
      @update:model-value="store.saveBackupSettings"
    ></v-select>

    <v-number-input
      v-model.number="store.backup.keepCount"
      label="保留备份数量"
      variant="outlined"
      hide-details="auto"
      class="mb-3"
      type="number"
      :min="1"
      :max="100"
      @update:model-value="store.saveBackupSettings"
    ></v-number-input>
  </v-form>
</template>
