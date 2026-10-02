<script setup lang="ts">
const props = withDefaults(defineProps<{ compact?: boolean; light?: boolean }>(), { compact: false, light: false })
const maskId = `reb-mark-${useId()}`
// Keep the supplied artwork intact. The white variant uses a luminance mask
// to remove the black rectangle, including inside isolated animation layers.
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
      <template v-if="light">
        <defs><mask :id="maskId" maskUnits="userSpaceOnUse" x="0" y="0" width="1280" height="904" style="mask-type: luminance"><image :href="artwork.src" width="1280" height="904" /></mask></defs>
        <rect width="1280" height="904" fill="white" :mask="`url(#${maskId})`" />
      </template>
      <image v-else :href="artwork.src" width="1280" height="904" />
    </svg>
  </div>
</template>
