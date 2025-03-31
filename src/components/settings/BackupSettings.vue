<script setup lang="ts">
import { useStore } from "../../stores/store";
import { open } from "@tauri-apps/plugin-dialog";
import { computed, ref, watch } from "vue";

// 使用Pinia Store
const store = useStore();

// 获取mysqldump可用状态的文字说明
const mysqldumpStatusText = computed(() => {
  return store.backup.mysqldumpAvailable
    ? "系统中已安装"
    : "系统中未安装，无法使用";
});

// 是否不限制保留天数
const unlimitedRetention = ref(store.backup.keepDays <= 0);

// 监听不限制保留天数开关变化
watch(unlimitedRetention, (newValue) => {
  if (newValue) {
    // 如果启用不限制，将保留天数设为0（特殊值，表示不限制）
    store.backup.keepDays = 0;
  } else if (store.backup.keepDays <= 0) {
    // 如果禁用不限制，且当前值小于等于0，设置为默认值
    store.backup.keepDays = 180;
  }
  store.saveBackupSettings();
});

// 监听保留天数变化
watch(
  () => store.backup.keepDays,
  (newValue) => {
    // 保持unlimitedRetention开关状态与keepDays值同步
    unlimitedRetention.value = newValue <= 0;
  }
);

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

    <!-- 自动备份和频率设置区 -->
    <div class="d-flex align-center mb-3 auto-backup-container">
      <div class="switch-container">
        <v-switch
          v-model="store.backup.auto"
          label="自动备份"
          color="primary"
          hide-details
          density="compact"
          class="backup-switch"
          inset
          @update:model-value="store.saveBackupSettings"
        ></v-switch>
      </div>

      <div class="input-container">
        <v-select
          v-model="store.backup.frequency"
          label="备份频率"
          :items="backupFrequencies"
          variant="outlined"
          hide-details="auto"
          :disabled="!store.backup.auto"
          @update:model-value="store.saveBackupSettings"
        ></v-select>
      </div>
    </div>

    <!-- 保留天数设置区 -->
    <div class="d-flex align-center mb-3 retention-setting-container">
      <div class="switch-container">
        <v-switch
          v-model="unlimitedRetention"
          label="永久保留"
          color="primary"
          hide-details
          density="compact"
          class="retention-switch"
          inset
        ></v-switch>
      </div>

      <div class="input-container">
        <v-number-input
          v-model.number="store.backup.keepDays"
          :label="unlimitedRetention ? '已禁用天数限制' : '保留备份天数'"
          variant="outlined"
          hide-details="auto"
          type="number"
          :disabled="unlimitedRetention"
          :min="1"
          :max="3650"
          @update:model-value="store.saveBackupSettings"
        ></v-number-input>
      </div>
    </div>
  </v-form>
</template>

<style scoped>
.engine-description {
  background-color: rgba(var(--v-theme-on-surface), 0.04);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.retention-setting-container,
.auto-backup-container {
  padding: 4px 0;
  display: flex;
  align-items: center;
}

.switch-container {
  min-width: 140px;
  flex-shrink: 0;
}

.input-container {
  flex-grow: 1;
}

.retention-switch :deep(.v-switch__track),
.backup-switch :deep(.v-switch__track) {
  opacity: 0.8;
}

.retention-switch :deep(.v-label),
.backup-switch :deep(.v-label) {
  opacity: 0.9;
  font-size: 0.875rem;
}
</style>
