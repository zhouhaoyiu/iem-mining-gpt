<script setup lang="ts">
import axios from 'axios'

axios.defaults.baseURL = 'http://localhost:3000/'
</script>

<template>
  <el-config-provider namespace="ep">
    <BaseHeader />
    <div class="main-container flex">
      <div h-full w-full flex items-center justify-center>
        <RouterView />
      </div>
    </div>
    <BaseFooter />
  </el-config-provider>
</template>

<style>
#app {
  text-align: center;
  color: var(--ep-text-color-primary);
}

.main-container {
  height: calc(100vh - 15rem);
  padding: 1rem;
  background-color: var(--ep-fill-color-light);
}
</style>
