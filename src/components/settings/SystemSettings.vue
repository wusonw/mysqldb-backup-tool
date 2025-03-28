<script setup lang="ts">
import { useStore } from "../../stores/store";

// 使用Pinia Store
const store = useStore();
</script>

<template>
  <v-form class="mt-2">
    <v-switch
      v-model="store.system.darkMode"
      label="深色模式"
      color="primary"
      hide-details
      class="mb-3"
      @update:model-value="store.saveSystemSettings"
    ></v-switch>

    <v-switch
      v-model="store.system.autoStart"
      label="开机自启动"
      color="primary"
      hide-details
      class="mb-3"
      @update:model-value="store.saveSystemSettings"
    ></v-switch>

    <v-switch
      v-model="store.system.minimizeToTray"
      label="最小化到托盘"
      color="primary"
      hide-details
      class="mb-3"
      @update:model-value="store.saveSystemSettings"
    ></v-switch>
  </v-form>
</template>
