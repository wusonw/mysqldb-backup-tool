<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { saveSetting, getSetting } from "../../utils/database";

// 定义props
const props = defineProps({
  backupSettings: {
    type: Object,
    required: true,
  },
  backupFrequencies: {
    type: Array,
    required: true,
  },
});

// 定义emit
const emit = defineEmits(["update:backupSettings", "statusUpdate"]);

// 本地状态
const path = ref(props.backupSettings.path || "");
const auto = ref(props.backupSettings.auto || false);
const frequency = ref(props.backupSettings.frequency || "daily");
const keepCount = ref(props.backupSettings.keepCount || 5);

// 监听本地状态变化
watch([path, auto, frequency, keepCount], async () => {
  // 更新父组件的设置
  emit("update:backupSettings", {
    path: path.value,
    auto: auto.value,
    frequency: frequency.value,
    keepCount: keepCount.value,
  });

  // 保存到数据库
  try {
    await saveSetting("backup.path", path.value);
    await saveSetting("backup.auto", auto.value);
    await saveSetting("backup.frequency", frequency.value);
    await saveSetting("backup.keepCount", keepCount.value);
  } catch (error) {
    console.error("保存备份设置失败:", error);
    emit("statusUpdate", "保存备份设置失败", "error");
  }
});

// 初始化时从数据库加载设置
onMounted(async () => {
  try {
    path.value = await getSetting("backup.path", "");
    auto.value = await getSetting("backup.auto", false);
    frequency.value = await getSetting("backup.frequency", "daily");
    keepCount.value = await getSetting("backup.keepCount", 5);

    // 更新父组件的设置
    emit("update:backupSettings", {
      path: path.value,
      auto: auto.value,
      frequency: frequency.value,
      keepCount: keepCount.value,
    });
  } catch (error) {
    console.error("加载备份设置失败:", error);
  }
});

// 选择备份路径
const selectBackupPath = async () => {
  try {
    // 这里可以实现文件对话框选择路径
    // 现在只是使用模拟数据
    path.value = "/用户/文档/数据库备份";
    emit("statusUpdate", "已选择备份路径", "success");
  } catch (error) {
    emit("statusUpdate", `选择路径错误: ${error}`, "error");
  }
};
</script>

<template>
  <v-form class="mt-2">
    <v-text-field
      v-model="path"
      label="备份文件保存路径"
      variant="outlined"
      hide-details="auto"
      class="mb-3"
      append-inner-icon="mdi-folder"
      @click:append-inner="selectBackupPath"
    ></v-text-field>

    <v-switch
      v-model="auto"
      label="启用自动备份"
      color="primary"
      hide-details
      class="mb-3"
    ></v-switch>

    <v-select
      v-model="frequency"
      label="备份频率"
      :items="backupFrequencies"
      variant="outlined"
      hide-details="auto"
      :disabled="!auto"
      class="mb-3"
    ></v-select>

    <v-number-input
      v-model.number="keepCount"
      label="保留备份数量"
      variant="outlined"
      hide-details="auto"
      class="mb-3"
      type="number"
      :min="1"
      :max="100"
    ></v-number-input>
  </v-form>
</template>
