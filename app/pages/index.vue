<script setup lang="ts">
import { ArrowUpRight, ArrowRight, Check, ShieldCheck, LoaderCircle, Gift, Mail, UserRound, Phone } from '@lucide/vue'
import { prizes } from '#shared/raffle'

const config = useRuntimeConfig()
useSeoMeta({
  title: 'Sorteio de livros · Conferência Teológica REB',
  description: 'Três livros da Thomas Nelson Brasil e um Kit Anglicano da REB. Quatro ganhadores na 2ª Conferência Teológica, em 3 de outubro de 2026.',
  ogTitle: 'Sorteio de livros · 2ª Conferência Teológica REB',
  ogDescription: 'Três livros e um Kit Anglicano. Inscreva-se para concorrer durante a conferência da REB.',
  ogImage: `${config.public.siteUrl}/images/premios.png`,
  ogType: 'website',
})
const { data: event, refresh } = await useFetch('/api/status')
const form = reactive({ name: '', whatsapp: '', email: '', adult: false, consent: false, website: '' })
const token = ref('')
const verification = ref<{ reset: () => void }>()
const ready = ref(false)
const sending = ref(false)
const received = ref(false)
const error = ref('')
const fieldErrors = reactive<Record<string, string>>({})
const formSection = ref<HTMLElement>()
const isOpen = computed(() => event.value?.available && event.value.status === 'open')
let polling: ReturnType<typeof setInterval>
function restoreReceipt() {
  try { received.value = !!event.value?.available && localStorage.getItem('reb-2026-received') === String(event.value.generation) }
  catch { received.value = false }
}
watch(() => event.value?.generation, () => { if (ready.value) restoreReceipt() })

onMounted(() => {
  ready.value = true
  restoreReceipt()
  polling = setInterval(() => { if (document.visibilityState === 'visible') refresh() }, 30000)
})
onBeforeUnmount(() => clearInterval(polling))

function formatPhone(e: Event) {
  const input = e.target as HTMLInputElement
  let digits = input.value.replace(/\D/g, '')
  if (digits.length > 11 && digits.startsWith('55')) digits = digits.slice(2)
  digits = digits.slice(0, 11)
  form.whatsapp = digits.length > 2 ? `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}${digits.length > 7 ? '-' + digits.slice(7) : ''}` : digits
  input.value = form.whatsapp
  delete fieldErrors.whatsapp
}

function validate() {
  Object.keys(fieldErrors).forEach(key => delete fieldErrors[key])
  if (form.name.trim().split(/\s+/).length < 2) fieldErrors.name = 'Digite seu nome e sobrenome.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) fieldErrors.email = 'Digite um e-mail válido.'
  if (form.whatsapp.replace(/\D/g, '').length !== 11) fieldErrors.whatsapp = 'Digite seu celular com DDD.'
  if (!form.adult || !form.consent) fieldErrors.consent = 'Confirme os dois itens para participar.'
  if (Object.keys(fieldErrors).length) {
    nextTick(() => formSection.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
    return false
  }
  return true
}

async function submit() {
  error.value = ''
  if (!validate() || sending.value) return
  if (config.public.turnstileSiteKey && !token.value) { error.value = 'Aguarde a verificação de segurança e tente novamente.'; return }
  sending.value = true
  try {
    const result = await $fetch('/api/register', { method: 'POST', body: { ...form, turnstileToken: token.value, generation: event.value?.generation } })
    received.value = true
    try { localStorage.setItem('reb-2026-received', String(result.generation)) } catch { /* Registration remains saved on the server. */ }
    await nextTick()
    formSection.value?.querySelector<HTMLElement>('.success-heading')?.focus()
  } catch (e: unknown) {
    error.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage ?? 'Não foi possível enviar. Confira sua conexão e tente novamente.'
    verification.value?.reset()
    refresh()
  } finally { sending.value = false }
}
</script>

<template>
  <div class="landing textured">
    <a class="skip-link" href="#participar">Ir para inscrição</a>
    <header class="site-header page-width">
      <NuxtLink to="/" aria-label="Início"><BrandMark light /></NuxtLink>
      <span class="header-event">2ª CONFERÊNCIA<br><strong>TEOLÓGICA</strong></span>
      <a class="live-link" href="https://www.youtube.com/@redeepiscopalbrasileira" target="_blank" rel="noopener noreferrer">Acompanhe no YouTube <ArrowUpRight :size="17" /></a>
    </header>

    <main>
      <section class="hero page-width" aria-labelledby="hero-title">
        <div class="hero-story">
          <div class="hero-copy">
            <h1 id="hero-title">Sorteio de<br><em>livros</em></h1>
            <p class="hero-description">Três livros da Thomas Nelson Brasil e um Kit Anglicano da REB. Inscreva-se e acompanhe os quatro sorteios na live.</p>
            <a class="mobile-register-link" href="#participar">{{ event?.status === 'closed' ? 'Ver a transmissão' : 'Quero participar' }} <ArrowRight :size="16" /></a>
          </div>

          <div class="hero-books" aria-label="Os três livros do sorteio">
            <div v-for="(prize, i) in prizes.filter(p => p.kind === 'book')" :key="prize.id" class="hero-book" :class="`hero-book-${i + 1}`">
              <BookCover :cover="prize.cover" :title="prize.title" />
            </div>
          </div>
          <a class="hero-kit" href="#kit-anglicano"><KitMockup /><div><h2>Kit Anglicano</h2><p>Livro, caneca e um item surpresa.</p><span>Oferecido pela REB <ArrowRight :size="14" /></span></div></a>
          <div class="hero-support"><div><span class="support-label">APOIO</span><SponsorLogo /></div><div class="prize-count"><span>04</span><p>prêmios.<br><strong>quatro ganhadores.</strong></p></div></div>
        </div>

        <div id="participar" ref="formSection" class="registration-card">
          <template v-if="received">
            <div class="success-content">
              <div class="success-symbol"><Check :size="36" :stroke-width="1.6" /></div>
              <p class="eyebrow">INSCRIÇÃO RECEBIDA</p>
              <h2 class="success-heading" tabindex="-1">Você está<br><em>no sorteio.</em></h2>
              <p>O resultado será anunciado na live. Se você ganhar, a REB entrará em contato.</p>
              <div class="success-note"><ShieldCheck :size="20" /><p>Uma inscrição por e-mail e WhatsApp.<br>Reenvios não criam novas chances.</p></div>
              <a class="button button-primary" href="https://www.youtube.com/@redeepiscopalbrasileira" target="_blank" rel="noopener noreferrer">Voltar para a live <ArrowUpRight :size="18" /></a>
            </div>
          </template>
          <template v-else-if="event?.status === 'closed'">
            <div class="closed-content">
              <p class="form-status"><span class="status-dot" />Inscrições encerradas</p>
              <h2>O cadastro<br><em>foi encerrado.</em></h2>
              <p class="form-intro">Acompanhe os quatro sorteios na transmissão da conferência.</p>
              <a class="button button-primary" href="https://www.youtube.com/@redeepiscopalbrasileira" target="_blank" rel="noopener noreferrer">Ver a live <ArrowUpRight :size="18" /></a>
            </div>
          </template>
          <template v-else>
            <div class="form-status"><span :class="['status-dot', { active: isOpen }]" />{{ isOpen ? 'Inscrições abertas' : 'Inscrições em breve' }}</div>
            <h2>Faça sua<br><em>inscrição.</em></h2>
            <p class="form-intro">A participação é gratuita. Informe seus contatos e acompanhe o resultado na live.</p>
            <form novalidate @submit.prevent="submit"><fieldset :disabled="!ready || sending">
              <div class="field"><label for="name">Nome completo</label><div class="input-wrap"><UserRound :size="18" /><input id="name" v-model="form.name" name="name" autocomplete="name" maxlength="100" placeholder="Como você se chama?" required :aria-invalid="!!fieldErrors.name" :aria-describedby="fieldErrors.name ? 'name-error' : undefined" @input="delete fieldErrors.name"></div><p v-if="fieldErrors.name" id="name-error" class="field-error">{{ fieldErrors.name }}</p></div>
              <div class="field"><label for="whatsapp">WhatsApp <span>com DDD</span></label><div class="input-wrap"><Phone :size="18" /><input id="whatsapp" :value="form.whatsapp" name="whatsapp" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="(11) 99999-9999" maxlength="20" required :aria-invalid="!!fieldErrors.whatsapp" :aria-describedby="fieldErrors.whatsapp ? 'phone-error' : undefined" @input="formatPhone"></div><p v-if="fieldErrors.whatsapp" id="phone-error" class="field-error">{{ fieldErrors.whatsapp }}</p></div>
              <div class="field"><label for="email">E-mail</label><div class="input-wrap"><Mail :size="18" /><input id="email" v-model="form.email" name="email" type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false" maxlength="254" placeholder="voce@exemplo.com" required :aria-invalid="!!fieldErrors.email" :aria-describedby="fieldErrors.email ? 'email-error' : undefined" @input="delete fieldErrors.email"></div><p v-if="fieldErrors.email" id="email-error" class="field-error">{{ fieldErrors.email }}</p></div>
              <div class="honeypot" aria-hidden="true"><label for="website">Seu site</label><input id="website" v-model="form.website" name="website" tabindex="-1" autocomplete="off"></div>
              <div class="consent-group">
                <label class="check-label"><input v-model="form.adult" type="checkbox" required :aria-invalid="!!fieldErrors.consent" aria-describedby="consent-error"><span>Tenho 18 anos ou mais, moro no Brasil e aceito o <NuxtLink to="/regulamento" target="_blank">regulamento</NuxtLink>.</span></label>
                <label class="check-label"><input v-model="form.consent" type="checkbox" required :aria-invalid="!!fieldErrors.consent" aria-describedby="consent-error"><span>Autorizo o uso dos meus dados neste sorteio, a exibição do primeiro nome na animação e o anúncio do nome completo se ganhar. Se ganhar um dos três livros, autorizo o envio dos dados necessários à Thomas Nelson para a entrega. A REB envia o kit, conforme a <NuxtLink to="/privacidade" target="_blank">política de privacidade</NuxtLink>.</span></label>
                <p v-if="fieldErrors.consent" id="consent-error" class="field-error">{{ fieldErrors.consent }}</p>
              </div>
              <TurnstileWidget ref="verification" @verified="token = $event" />
              <p v-if="error" class="form-error" role="alert">{{ error }}</p>
              <p v-if="!event?.available" class="availability-note">Estamos preparando as inscrições. Volte em instantes.</p>
              <button class="button button-primary register-button" type="submit" :disabled="!ready || sending || !isOpen">
                <LoaderCircle v-if="sending" class="spin" :size="19" />
                <template v-else>{{ isOpen ? 'Quero participar do sorteio' : 'As inscrições abrem na live' }}<ArrowRight v-if="isOpen" :size="19" /></template>
              </button>
              <p class="form-footnote"><ShieldCheck :size="14" /> Seus dados são usados só para este sorteio.</p>
            </fieldset></form>
          </template>
          <div class="card-bottom"><Gift :size="16" /><span>4 ganhadores · um prêmio por pessoa</span></div>
        </div>
      </section>

      <section class="prizes-section" aria-labelledby="prizes-title">
        <div class="page-width"><div class="section-heading"><div><p class="eyebrow">PRÊMIOS</p><h2 id="prizes-title">Livros e<br><em>Kit Anglicano</em></h2></div><p>Três livros e um kit completo.<br>Uma pessoa diferente em cada sorteio.</p></div>
          <div class="prize-grid">
            <article v-for="prize in prizes" :id="prize.kind === 'kit' ? 'kit-anglicano' : undefined" :key="prize.id" class="prize-card" :class="{ 'prize-card-kit': prize.kind === 'kit' }">
              <div class="prize-art"><PrizeVisual :cover="prize.cover" :title="prize.title" /></div>
              <div class="prize-info"><span class="prize-index">0{{ prize.id }}</span><p>{{ prize.author }}</p><h3>{{ prize.title }}</h3>
                <template v-if="prize.kind === 'kit'"><ul class="kit-contents"><li v-for="item in prize.contents" :key="item">{{ item }}</li></ul><p class="kit-disclaimer">O livro embrulhado representa o item surpresa.</p></template>
                <span v-else>{{ prize.short }}</span>
              </div>
            </article>
          </div>
        </div>
      </section>

    </main>
    <footer class="site-footer page-width"><span>© 2026 Rede Episcopal Brasileira</span><nav aria-label="Rodapé"><NuxtLink to="/regulamento">Regulamento</NuxtLink><NuxtLink to="/privacidade">Privacidade</NuxtLink></nav><span>2ª Conferência Teológica</span></footer>
  </div>
</template>
