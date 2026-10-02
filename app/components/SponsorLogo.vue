<script setup lang="ts">
const filterId = useId()
</script>
<template>
  <div class="sponsor-logo" role="img" aria-label="Apoio: Thomas Nelson Brasil">
    <svg viewBox="691 1065 145 122" aria-hidden="true">
      <defs>
        <filter :id="filterId" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0.2126 0.7152 0.0722 0 0" /><feComponentTransfer><feFuncA type="linear" slope="8" intercept="-5.4" /></feComponentTransfer></filter>
      </defs>
      <image href="/images/premios.png" width="1080" height="1350" :filter="`url(#${filterId})`" />
    </svg>
    <span class="sponsor-logo-name">Thomas Nelson</span><span class="sponsor-logo-country">BRASIL</span>
  </div>
</template>
