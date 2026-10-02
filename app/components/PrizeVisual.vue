<script setup lang="ts">
defineProps<{ cover: string; title: string }>()
</script>

<template>
  <KitMockup v-if="cover === 'anglican-kit'" />
  <BookCover v-else :cover="cover" :title="title" />
</template>
