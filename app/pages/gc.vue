<script setup lang="ts">
import { ArrowUpRight } from '@lucide/vue'
const route = useRoute()
const full = computed(() => route.query.modo === 'tela')
useSeoMeta({ title: 'GC · Sorteio de livros REB', robots: 'noindex, nofollow' })
useHead({ bodyAttrs: { class: 'gc-body' } })
</script>
<template>
  <main class="gc-canvas" :class="{ 'gc-full textured': full }">
    <template v-if="full"><header class="gc-full-header"><BrandMark light /><span>2ª CONFERÊNCIA TEOLÓGICA · 03 OUT 2026</span></header><section class="gc-full-content"><div><p class="eyebrow">APOIO THOMAS NELSON BRASIL</p><h1>Participe do<br><em>sorteio de livros.</em></h1><p>Aponte a câmera, faça sua inscrição<br>e acompanhe o sorteio nesta live.</p><div class="gc-full-books"><BookCover cover="scripture" title="Toda a Escritura é…" /><BookCover cover="religion" title="Religião estranha" /><BookCover cover="powers" title="Jesus e os poderes" /></div></div><div class="gc-full-qr"><img src="/live/qr-sorteio.svg" alt="QR Code para sorteio.redeepiscopalbrasileira.com.br" width="400" height="400"><strong>PARTICIPE DO SORTEIO</strong><span>4 ganhadores · um prêmio por pessoa</span></div></section><footer class="gc-full-footer"><span>sorteio.redeepiscopalbrasileira.com.br</span><SponsorLogo /></footer></template>
    <div v-else class="lower-third"><div class="gc-qr"><img src="/live/qr-sorteio.svg" alt="QR Code para se inscrever no sorteio" width="192" height="192"><span>APONTE A CÂMERA</span></div><div class="gc-copy"><p>SORTEIO DE LIVROS · 2ª CONFERÊNCIA TEOLÓGICA</p><h1>Participe do <em>sorteio de livros.</em></h1><span>sorteio.redeepiscopalbrasileira.com.br <ArrowUpRight :size="25" /></span></div><div class="gc-sponsor"><span>4 GANHADORES<br>UM PRÊMIO POR PESSOA</span><div><small>APOIO</small><SponsorLogo /></div></div><div class="gc-brand"><BrandMark compact light /></div></div>
  </main>
</template>
