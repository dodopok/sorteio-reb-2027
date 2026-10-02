<script setup lang="ts">
const props = withDefaults(defineProps<{ compact?: boolean; light?: boolean }>(), { compact: false, light: false })
// Display the supplied official PNGs through a viewport. The original artwork,
// including its lettering, is preserved; only transparent canvas padding is hidden.
const artwork = computed(() => {
  if (props.light) return {
    src: '/images/brand/reb-logo-variants.png',
    viewBox: props.compact ? '795 501 169 187' : '795 501 388 207',
  }
  return {
    src: props.compact ? '/images/brand/reb-icon-color.png' : '/images/brand/reb-logo-color.png',
    viewBox: props.compact ? '427 206 407 463' : '253 217 842 455',
  }
})
</script>

<template>
  <div class="brand" :class="{ 'brand-light': light, 'brand-compact': compact }" role="img" aria-label="Rede Episcopal Brasileira">
    <svg :class="compact ? 'brand-icon' : 'brand-logo'" :viewBox="artwork.viewBox" aria-hidden="true">
      <image :href="artwork.src" width="1280" height="904" />
    </svg>
  </div>
</template>
