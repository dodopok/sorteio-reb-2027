<script setup lang="ts">
import { ArrowUpRight, ArrowRight, Check, ShieldCheck, LoaderCircle, Gift, Mail, UserRound, Phone } from '@lucide/vue'
import { prizes } from '#shared/raffle'

const config = useRuntimeConfig()
useSeoMeta({
  title: 'Sorteio de livros · Conferência Teológica REB',
  description: 'Participe do sorteio de três livros com apoio da Thomas Nelson Brasil, na 2ª Conferência Teológica da Rede Episcopal Brasileira. 3 de outubro de 2026.',
  ogTitle: 'Sorteio de livros · 2ª Conferência Teológica REB',
  ogDescription: 'Cadastre-se para o sorteio de três livros durante a conferência, com apoio da Thomas Nelson Brasil.',
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

onMounted(() => {
  ready.value = true
  try { received.value = localStorage.getItem('reb-2026-received') === 'true' } catch { /* Private browsing may disable local storage. */ }
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
    await $fetch('/api/register', { method: 'POST', body: { ...form, turnstileToken: token.value } })
    received.value = true
    try { localStorage.setItem('reb-2026-received', 'true') } catch { /* Registration remains saved on the server. */ }
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
          <div class="event-pill"><span class="live-dot" /><span>03 OUT · 8H ÀS 12H</span><span class="pill-divider" /> <span>AO VIVO NO YOUTUBE</span></div>
          <div class="hero-copy">
            <p class="eyebrow"><span /> 2ª CONFERÊNCIA TEOLÓGICA</p>
            <h1 id="hero-title">Sorteio de<br><em>livros.</em></h1>
            <p class="hero-description">Durante a conferência, vamos sortear três livros com apoio da Thomas Nelson Brasil. Inscreva-se para participar.</p>
            <a class="mobile-register-link" href="#participar">{{ event?.status === 'closed' ? 'Ver a transmissão' : 'Quero participar' }} <ArrowRight :size="16" /></a>
          </div>

          <div class="hero-books" aria-label="Os três livros do sorteio">
            <div v-for="(prize, i) in prizes" :key="prize.id" class="hero-book" :class="`hero-book-${i + 1}`">
              <BookCover :cover="prize.cover" :title="prize.title" />
            </div>
          </div>
          <div class="hero-support"><div><span class="support-label">APOIO</span><SponsorLogo /></div><div class="prize-count"><span>03</span><p>livros.<br><strong>três ganhadores.</strong></p></div></div>
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
              <p class="form-intro">Acompanhe os três sorteios na transmissão da conferência.</p>
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
                <label class="check-label"><input v-model="form.consent" type="checkbox" required :aria-invalid="!!fieldErrors.consent" aria-describedby="consent-error"><span>Autorizo a REB a usar meus dados para este sorteio, divulgar meu nome se ganhar e compartilhar meus dados com a Thomas Nelson para o envio, conforme a <NuxtLink to="/privacidade" target="_blank">política de privacidade</NuxtLink>.</span></label>
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
          <div class="card-bottom"><Gift :size="16" /><span>3 ganhadores · 1 livro para cada um</span></div>
        </div>
      </section>

      <section class="prizes-section" aria-labelledby="prizes-title">
        <div class="page-width"><div class="section-heading"><div><p class="eyebrow">PRÊMIOS</p><h2 id="prizes-title">Os livros<br><em>do sorteio.</em></h2></div><p>Um exemplar de cada título.<br>Uma pessoa diferente em cada sorteio.</p></div>
          <div class="prize-grid"><article v-for="prize in prizes" :key="prize.id" class="prize-card"><div class="prize-art"><span class="prize-index">0{{ prize.id }}</span><BookCover :cover="prize.cover" :title="prize.title" /></div><div class="prize-info"><p>{{ prize.author }}</p><h3>{{ prize.title }}</h3><span>{{ prize.short }}</span></div></article></div>
        </div>
      </section>

    </main>
    <footer class="site-footer page-width"><span>© 2026 Rede Episcopal Brasileira</span><nav aria-label="Rodapé"><NuxtLink to="/regulamento">Regulamento</NuxtLink><NuxtLink to="/privacidade">Privacidade</NuxtLink></nav><span>2ª Conferência Teológica</span></footer>
  </div>
</template>
