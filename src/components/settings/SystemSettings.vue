<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { saveSetting, getSetting } from "../../utils/database";

// 定义props
const props = defineProps({
  systemSettings: {
    type: Object,
    required: true,
  },
});

// 定义emit
const emit = defineEmits(["update:systemSettings", "statusUpdate"]);

// 本地状态
const darkMode = ref(props.systemSettings.darkMode || false);
const autoStart = ref(props.systemSettings.autoStart || false);
const minimizeToTray = ref(props.systemSettings.minimizeToTray || true);

// 监听本地状态变化
watch([darkMode, autoStart, minimizeToTray], async () => {
  // 更新父组件的设置
  emit("update:systemSettings", {
    darkMode: darkMode.value,
    autoStart: autoStart.value,
    minimizeToTray: minimizeToTray.value,
  });

  // 保存到数据库
  try {
    await saveSetting("system.darkMode", darkMode.value);
    await saveSetting("system.autoStart", autoStart.value);
    await saveSetting("system.minimizeToTray", minimizeToTray.value);
  } catch (error) {
    console.error("保存系统设置失败:", error);
    emit("statusUpdate", "保存系统设置失败", "error");
  }
});

// 初始化时从数据库加载设置
onMounted(async () => {
  try {
    darkMode.value = await getSetting("system.darkMode", false);
    autoStart.value = await getSetting("system.autoStart", false);
    minimizeToTray.value = await getSetting("system.minimizeToTray", true);

    // 更新父组件的设置
    emit("update:systemSettings", {
      darkMode: darkMode.value,
      autoStart: autoStart.value,
      minimizeToTray: minimizeToTray.value,
    });
  } catch (error) {
    console.error("加载系统设置失败:", error);
  }
});
</script>

<template>
  <v-form class="mt-2">
    <v-switch
      v-model="darkMode"
      label="深色模式"
      color="primary"
      hide-details
      class="mb-3"
    ></v-switch>

    <v-switch
      v-model="autoStart"
      label="开机自启动"
      color="primary"
      hide-details
      class="mb-3"
    ></v-switch>

    <v-switch
      v-model="minimizeToTray"
      label="最小化到托盘"
      color="primary"
      hide-details
      class="mb-3"
    ></v-switch>
  </v-form>
</template>
