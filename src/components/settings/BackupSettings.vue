<script setup lang="ts">
import { useStore } from "../../stores/store";
import { open } from "@tauri-apps/plugin-dialog";
import { computed } from "vue";

// 使用Pinia Store
const store = useStore();

// 获取mysqldump可用状态的文字说明
const mysqldumpStatusText = computed(() => {
  return store.backup.mysqldumpAvailable
    ? "系统中已安装"
    : "系统中未安装，无法使用";
});

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
    <!-- 备份引擎选择（左右布局，放在最上面） -->
    <div class="mb-5">
      <div class="d-flex align-center mb-2">
        <div class="text-h6 font-weight-medium">备份引擎</div>
        <v-spacer></v-spacer>
        <v-btn-toggle
          v-model="store.backup.backupEngine"
          color="primary"
          rounded="lg"
          mandatory
          @update:model-value="store.saveBackupSettings"
        >
          <v-btn
            value="mysqldump"
            :disabled="!store.backup.mysqldumpAvailable"
            variant="outlined"
            :color="store.backup.backupEngine === 'mysqldump' ? 'primary' : ''"
            prepend-icon="mdi-database-export"
          >
            mysqldump
          </v-btn>
          <v-btn
            value="builtin"
            variant="outlined"
            :color="store.backup.backupEngine === 'builtin' ? 'primary' : ''"
            prepend-icon="mdi-code-brackets"
          >
            内置引擎
          </v-btn>
        </v-btn-toggle>
      </div>

      <!-- 引擎说明 -->
      <div class="engine-description pa-3 rounded-lg mb-4">
        <div v-if="store.backup.backupEngine === 'mysqldump'">
          <div class="d-flex align-center">
            <v-icon
              :color="store.backup.mysqldumpAvailable ? 'success' : 'error'"
              class="mr-2"
            >
              {{
                store.backup.mysqldumpAvailable
                  ? "mdi-check-circle"
                  : "mdi-alert-circle"
              }}
            </v-icon>
            <div class="text-caption">
              <span class="font-weight-medium">mysqldump命令</span> -
              {{ mysqldumpStatusText }}
            </div>
          </div>
          <div class="text-caption mt-2 ml-6">
            使用MySQL官方工具备份，需要系统中已安装mysqldump命令。通常性能更好，兼容性更高。
          </div>
        </div>
        <div v-else>
          <div class="d-flex align-center">
            <v-icon color="success" class="mr-2">mdi-check-circle</v-icon>
            <div class="text-caption">
              <span class="font-weight-medium">内置引擎</span> -
              随应用内置，无需额外安装
            </div>
          </div>
          <div class="text-caption mt-2 ml-6">
            使用应用内置的备份功能，不依赖系统环境，适用于任何情况，但可能在特殊情况下速度较慢。
          </div>
        </div>
      </div>
    </div>

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

<style scoped>
.engine-description {
  background-color: rgba(var(--v-theme-on-surface), 0.04);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}
</style>
