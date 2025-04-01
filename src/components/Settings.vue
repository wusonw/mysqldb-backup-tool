<script setup lang="ts">
import { computed } from "vue";
import DatabaseSettings from "./settings/DatabaseSettings.vue";
import BackupSettings from "./settings/BackupSettings.vue";
import SystemSettings from "./settings/SystemSettings.vue";
import { usePiniaStore, backupFrequencies } from "../stores/store";

// 使用Pinia Store
const store = usePiniaStore();

// 定义props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

// 定义emit
const emit = defineEmits(["update:modelValue"]);

// 设置的 v-model 处理
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value),
});
</script>

<template>
  <v-dialog v-model="dialogVisible" width="600">
    <v-card>
      <v-card-title>
        <v-tabs v-model="store.ui.activeTab">
          <v-tab value="database">数据库配置</v-tab>
          <v-tab value="backup">备份设置</v-tab>
          <v-tab value="system">系统设置</v-tab>
        </v-tabs>
      </v-card-title>

      <v-card-text>
        <v-window v-model="store.ui.activeTab">
          <!-- 数据库配置页 -->
          <v-window-item value="database">
            <DatabaseSettings />
          </v-window-item>

          <!-- 备份设置页 -->
          <v-window-item value="backup">
            <BackupSettings :backup-frequencies="backupFrequencies" />
          </v-window-item>

          <!-- 系统设置页 -->
          <v-window-item value="system">
            <SystemSettings />
          </v-window-item>
        </v-window>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
