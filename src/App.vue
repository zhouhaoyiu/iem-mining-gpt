<script setup lang="ts">
</script>

<template>
  <el-config-provider namespace="ep">
    <BaseHeader />
    <div class="main-container flex">
      <div w-full h-full flex items-center justify-center>
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
  height: calc(100vh - 10rem);
}
</style>
