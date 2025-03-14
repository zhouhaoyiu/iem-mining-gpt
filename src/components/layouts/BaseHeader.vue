<script lang="ts" setup>

</script>

<template>
  <div class="header">
    <span class="title">
      NEU GPT
    </span>
    <!-- 最右边小字 created by zhy -->
    <span class="author">created by zhy</span>
  </div>
</template>

<style lang="scss" scoped>
.header {
  background-color: var(--router-view-bg-color);
  width: 100%;
  height: 5rem;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  .title {
    font-size: 2rem;
  }
  .author {
    position: absolute;
    right: 1rem;
    font-size: 0.8rem;
    margin-left: 1rem;
  }
}
</style>
