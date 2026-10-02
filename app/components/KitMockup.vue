<script setup lang="ts">
const id = useId()
</script>

<template>
  <svg class="kit-mockup" viewBox="0 0 720 580" role="img" aria-label="Kit Anglicano: O Caminho Anglicano, caneca Seja anglicano gostoso demais e um item surpresa representado por um livro embrulhado">
    <defs>
      <linearGradient :id="`${id}-spine`"><stop stop-color="#000" stop-opacity=".3" /><stop offset=".5" stop-color="#fff" stop-opacity=".16" /><stop offset="1" stop-color="#000" stop-opacity=".08" /></linearGradient>
      <filter :id="`${id}-shadow`" x="-30%" y="-20%" width="170%" height="155%"><feDropShadow dx="6" dy="12" stdDeviation="10" flood-color="#170d16" flood-opacity=".22" /></filter>
      <filter :id="`${id}-blur`" x="-25%" y="-100%" width="150%" height="300%"><feGaussianBlur stdDeviation="10" /></filter>
    </defs>
    <ellipse cx="355" cy="548" rx="285" ry="15" fill="#1b1522" opacity=".15" :filter="`url(#${id}-blur)`" />

    <image href="/images/kit/mystery-book.png" x="288" y="71" width="315" height="474" transform="rotate(7 445 308)" preserveAspectRatio="xMidYMid meet" />

    <!-- Keep the supplied cover unchanged and the generated products in their original proportions. -->
    <g transform="translate(54 42) rotate(-7 140 240)" :filter="`url(#${id}-shadow)`">
      <path d="M4 9L276 0L287 9L15 18Z" fill="#f5ead7" />
      <path d="M276 0L287 9V463L276 472Z" fill="#a39577" />
      <image href="/images/kit/anglican-book.png" y="10" width="277" height="458" preserveAspectRatio="none" />
      <rect y="10" width="18" height="458" :fill="`url(#${id}-spine)`" />
      <path d="M4 13V463" stroke="#000" stroke-opacity=".13" stroke-width="2" />
    </g>

    <image href="/images/kit/anglican-mug.png" x="364" y="255" width="330" height="298" preserveAspectRatio="xMidYMid meet" />
  </svg>
</template>
