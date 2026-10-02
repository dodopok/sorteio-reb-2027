<script setup lang="ts">
import { ArrowLeft, ArrowRight, Maximize, Minimize, Sparkles, LoaderCircle, RotateCcw } from '@lucide/vue'
import { prizes } from '#shared/raffle'
import type { Dashboard, DrawResult, Winner } from '#shared/raffle'
const props = withDefaults(defineProps<{ demo?: boolean }>(), { demo: false })
type StageData = Omit<Dashboard, 'contacts'>
const data = ref<StageData>()
const state = ref<'ready' | 'drawing' | 'revealed'>('ready')
const revealed = ref<Winner>()
const animation = ref<{ winner: Winner; names: string[]; generation: number }>()
const drawingPrizeId = ref<number>()
const error = ref('')
const loading = ref(true)
const fullscreen = ref(false)
const reducedMotion = ref(false)
let polling: ReturnType<typeof setInterval>
let alive = true
const nextPrize = computed(() => prizes[Math.min(data.value?.winners.length ?? 0, 2)]!)
const roundTitle = computed(() => ['Primeiro sorteio', 'Segundo sorteio', 'Terceiro sorteio'][nextPrize.value.id - 1]!)
const activePrize = computed(() => {
  const prizeId = state.value === 'revealed' ? revealed.value?.prizeId : state.value === 'drawing' ? drawingPrizeId.value : undefined
  return prizeId ? prizes[prizeId - 1]! : nextPrize.value
})
const finished = computed(() => (data.value?.winners.length ?? 0) >= 3)
const demoNames = ['Mariana Oliveira', 'João Pedro Santos', 'Ana Beatriz Costa']
const demoFirstNames = ['Mariana', 'João', 'Ana', 'Lucas', 'Beatriz', 'Rafael', 'Camila', 'Pedro', 'Juliana', 'Gabriel', 'Fernanda', 'Mateus']
const particles = Array.from({ length: 36 }, (_, i) => ({ left: `${(i * 47) % 100}%`, delay: `${(i % 7) * .12}s`, duration: `${2.5 + (i % 5) * .3}s`, rotation: `${i * 33}deg` }))
const pendingKey = 'reb-pending-draw-2026'
type PendingDraw = { requestId: string; prizeId: number; generation: number }
let pendingDraw: PendingDraw | undefined

async function load() {
  if (props.demo) { data.value ??= { generation: 1, status: 'closed', total: 327, eligible: 327, winners: [] }; loading.value = false; return }
  try {
    const updated = await $fetch<StageData>('/api/admin/stage')
    if (data.value && updated.generation !== data.value.generation) {
      animation.value = undefined
      revealed.value = undefined
      state.value = 'ready'
      forgetPending()
    }
    data.value = updated
    error.value = ''
  }
  catch (e: unknown) {
    if ((e as { statusCode?: number }).statusCode === 401) { await navigateTo('/admin/login'); return }
    error.value = 'A conexão com o sorteio foi interrompida. Tente atualizar.'
  } finally { loading.value = false }
}
function readPending() {
  if (pendingDraw) return pendingDraw
  try { return JSON.parse(sessionStorage.getItem(pendingKey) || 'null') as PendingDraw | null }
  catch { return undefined }
}
function forgetPending() { pendingDraw = undefined; try { sessionStorage.removeItem(pendingKey) } catch { /* Storage may be disabled. */ } }

async function draw() {
  if (state.value === 'drawing' || !data.value || finished.value || data.value.status !== 'closed') return
  error.value = ''
  state.value = 'drawing'
  revealed.value = undefined
  animation.value = undefined
  const generation = data.value.generation
  let pending = props.demo ? undefined : readPending()
  if (!props.demo && pending?.generation !== generation) { pending = undefined; forgetPending() }
  const requestId = props.demo ? crypto.randomUUID() : pending?.requestId || crypto.randomUUID()
  const prizeId = props.demo ? data.value.winners.length + 1 : pending?.prizeId ?? data.value.winners.length + 1
  drawingPrizeId.value = prizeId
  if (!props.demo) {
    pendingDraw = { requestId, prizeId, generation }
    try { sessionStorage.setItem(pendingKey, JSON.stringify(pendingDraw)) } catch { /* In-memory retries still reuse the same UUID. */ }
  }
  // Persist a single draw before revealing. A retry reuses the same request ID.
  try {
    const result: DrawResult = props.demo
      ? { id: requestId, prizeId: data.value.winners.length + 1, name: demoNames[data.value.winners.length]!, drawnAt: new Date().toISOString(), eligibleCount: data.value.eligible, poolHash: 'ensaio', animationNames: demoFirstNames }
      : await $fetch<DrawResult>('/api/admin/draw', { method: 'POST', body: { requestId, prizeId, generation }, timeout: 15000 })
    if (!alive) return
    const { animationNames, ...winner } = result
    if (reducedMotion.value) { await reveal(winner, generation); return }
    animation.value = { winner, generation, names: animationNames }
  } catch (e: unknown) {
    state.value = 'ready'
    error.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage ?? 'Não recebemos a confirmação. Clique novamente para recuperar o mesmo sorteio.'
    if ((e as { statusCode?: number }).statusCode === 409) { forgetPending(); await load(); if (data.value?.winners.length) showWinner(data.value.winners.at(-1)!) }
    // Keep the UUID after timeouts: the transaction may have committed.
    if ((e as { statusCode?: number }).statusCode === 401) await navigateTo('/admin/login')
  }
}

async function reveal(winner: Winner, generation: number) {
  if (!alive || !data.value) return
  if (!props.demo) {
    await load()
    if (!alive || data.value.generation !== generation) return
  }
  revealed.value = winner
  animation.value = undefined
  state.value = 'revealed'
  if (props.demo) { data.value.winners.push(winner); data.value.eligible-- }
  else forgetPending()
}
async function finishAnimation() { if (animation.value) await reveal(animation.value.winner, animation.value.generation) }
function next() { revealed.value = undefined; state.value = 'ready' }
function replayDemo() { data.value = { generation: 1, status: 'closed', total: 327, eligible: 327, winners: [] }; next() }
async function toggleFullscreen() {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen() }
  catch { error.value = 'Use a opção de tela cheia do navegador.' }
}
function fullscreenChanged() { fullscreen.value = !!document.fullscreenElement }
function showWinner(winner: Winner) { if (state.value !== 'drawing') { revealed.value = winner; state.value = 'revealed' } }

onMounted(async () => {
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.addEventListener('fullscreenchange', fullscreenChanged)
  await load()
  // On reload recover the latest saved result without selecting another person.
  const pending = props.demo ? undefined : readPending()
  if (pending && pending.generation !== data.value?.generation) forgetPending()
  if (!props.demo && pending?.generation === data.value?.generation && data.value?.status === 'closed') {
    // A request may still be in flight. Retry that exact UUID before deciding.
    if (finished.value) { forgetPending(); showWinner(data.value.winners.at(-1)!) }
    else await draw()
  } else if (!props.demo && data.value?.winners.length) {
    showWinner(data.value.winners.at(-1)!)
  }
  polling = setInterval(() => { if (state.value !== 'drawing' && document.visibilityState === 'visible') load() }, 20000)
})
onBeforeUnmount(() => { alive = false; clearInterval(polling); document.removeEventListener('fullscreenchange', fullscreenChanged) })
</script>

<template>
  <main class="draw-stage textured" :class="{ 'stage-revealed': state === 'revealed', 'stage-drawing': state === 'drawing' }">
    <div class="stage-ambient" aria-hidden="true"><span /><span /><span /></div>
    <header class="stage-header"><BrandMark light /><div class="stage-event"><span>2ª CONFERÊNCIA</span><em>Teológica</em></div><div class="stage-tag"><span class="live-dot" />{{ demo ? 'ENSAIO · DADOS FICTÍCIOS' : 'SORTEIO AO VIVO' }}</div></header>
    <div v-if="loading" class="stage-loading"><LoaderCircle :size="30" class="spin" />Carregando o sorteio…</div>
    <template v-else-if="data"><section class="stage-main"><div class="stage-book"><div class="stage-book-halo" /><BookCover :key="activePrize.id" :cover="activePrize.cover" :title="activePrize.title" /><div class="stage-book-caption"><span>LIVRO 0{{ activePrize.id }}</span><h2>{{ activePrize.title }}</h2><p>{{ activePrize.author }}</p></div></div>
        <div class="stage-message" aria-live="polite" aria-atomic="true">
          <template v-if="state === 'ready'"><h1 class="stage-ready-title">{{ finished ? 'Sorteio encerrado' : roundTitle }}</h1><p v-if="!finished" class="stage-ready-participants"><strong>{{ data.eligible }}</strong> {{ data.eligible === 1 ? 'participante' : 'participantes' }}</p></template>
          <template v-else-if="state === 'drawing'"><p class="eyebrow">SORTEANDO…</p><NameReel v-if="animation" :names="animation.names" :winner="animation.winner.name" @complete="finishAnimation" /><div v-else class="stage-draw-loading"><LoaderCircle :size="26" class="spin" /><p>Preparando o sorteio…</p></div></template>
          <template v-else-if="revealed"><p class="eyebrow winner-eyebrow"><Sparkles :size="19" /> ESSE LIVRO É SEU!</p><h1 class="winner-name">{{ revealed.name }}</h1><p class="winner-congratulations">Parabéns!</p><div class="winner-book-label"><span>VOCÊ GANHOU</span><strong>{{ activePrize.title }}</strong></div><p class="winner-contact-note">A REB entrará em contato para combinar o envio.</p></template>
        </div>
      </section>
      <div v-if="state === 'revealed'" class="confetti" aria-hidden="true"><i v-for="(particle, i) in particles" :key="i" :style="{ left: particle.left, animationDelay: particle.delay, animationDuration: particle.duration, '--rotation': particle.rotation }" /></div>
      <div class="stage-results"><button v-for="prize in prizes" :key="prize.id" :disabled="state === 'drawing' || !data.winners.find(w => w.prizeId === prize.id)" @click="showWinner(data.winners.find(w => w.prizeId === prize.id)!)"><span class="result-number">0{{ prize.id }}</span><div><span class="result-prize">{{ prize.title }}</span><strong>{{ data.winners.find(w => w.prizeId === prize.id)?.name ?? 'Aguardando sorteio' }}</strong></div><span v-if="data.winners.find(w => w.prizeId === prize.id)" class="result-check">✓</span></button></div>
    </template>
    <p v-if="error" role="alert" class="stage-error">{{ error }} <button class="text-button" @click="load">Atualizar</button></p>
    <footer class="stage-footer"><div class="stage-sponsor"><span>APOIO</span><SponsorLogo /></div><div class="stage-controls"><NuxtLink class="stage-back" :to="demo ? '/admin' : '/admin'"><ArrowLeft :size="16" /><span>Painel</span></NuxtLink><button class="stage-fullscreen" :aria-label="fullscreen ? 'Sair da tela cheia' : 'Tela cheia'" @click="toggleFullscreen"><Minimize v-if="fullscreen" :size="19" /><Maximize v-else :size="19" /></button><button v-if="data?.status !== 'closed'" class="button stage-draw-button" disabled>Encerre as inscrições no painel</button><button v-else-if="state === 'drawing'" class="button stage-draw-button" disabled><LoaderCircle :size="19" class="spin" /> Sorteando…</button><button v-else-if="state === 'revealed' && !finished" class="button stage-draw-button" @click="next">Próximo livro <ArrowRight :size="19" /></button><button v-else-if="!finished" class="button stage-draw-button" :disabled="!data || data.eligible < 1" @click="draw"><Sparkles :size="19" /> {{ demo ? 'Ensaiar sorteio' : 'Sortear agora' }}</button><button v-else-if="demo" class="button stage-draw-button" @click="replayDemo"><RotateCcw :size="18" /> Repetir ensaio</button><span v-else class="stage-complete">Sorteio encerrado.</span></div></footer>
  </main>
</template>
