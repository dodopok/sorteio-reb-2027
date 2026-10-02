<script setup lang="ts">
defineProps<{ cover: string; title: string }>()
const shadeId = useId()
</script>

<template>
  <svg class="book-cover" viewBox="0 0 666 1000" role="img" :aria-label="title">
    <defs><linearGradient :id="shadeId"><stop stop-color="#000" stop-opacity=".3" /><stop offset=".4" stop-color="#fff" stop-opacity=".13" /><stop offset="1" stop-color="#000" stop-opacity=".08" /></linearGradient></defs>
    <path d="M9 6L652 0L660 9L10 15Z" fill="#e8ddc9" />
    <image :href="`/images/books/${cover}.jpg`" x="0" y="10" width="650" height="990" preserveAspectRatio="none" />
    <rect y="10" width="24" height="990" :fill="`url(#${shadeId})`" />
    <path d="M3 11V997" stroke="#000" stroke-opacity=".18" stroke-width="3" />
  </svg>
</template>
