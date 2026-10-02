<script setup lang="ts">
withDefaults(defineProps<{ compact?: boolean; light?: boolean }>(), { compact: false, light: false })
</script>

<template>
  <div class="brand" :class="{ 'brand-light': light, 'brand-compact': compact }" aria-label="Rede Episcopal Brasileira">
    <svg class="brand-icon" viewBox="0 0 80 92" fill="none" aria-hidden="true">
      <path d="M40 3C28 12 9 24 7 44V85H73V44C71 24 52 12 40 3Z" stroke="currentColor" stroke-width="3" />
      <path d="M40 11C29 20 16 29 15 45V77H65V45C64 29 51 20 40 11Z" stroke="currentColor" stroke-width="2.5" />
      <path d="M35 33H45V44H56V55H45V76H35V55H24V44H35V33Z" fill="currentColor" />
      <circle cx="40" cy="25" r="3" stroke="currentColor" stroke-width="2" />
      <circle cx="25" cy="65" r="3" stroke="currentColor" stroke-width="2" />
      <circle cx="55" cy="65" r="3" stroke="currentColor" stroke-width="2" />
    </svg>
    <span v-if="!compact" class="brand-name">Rede Episcopal<br><strong>Brasileira</strong></span>
  </div>
</template>
