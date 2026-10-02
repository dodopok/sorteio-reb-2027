<script setup lang="ts">
import { ArrowUpRight, Radio, LockKeyhole, UnlockKeyhole, UsersRound, Gift, CheckCircle2, LogOut, Eye, EyeOff, Download, LoaderCircle, MonitorPlay, RefreshCw, Trash2 } from '@lucide/vue'
import { prizes } from '#shared/raffle'
import type { Dashboard } from '#shared/raffle'
useSeoMeta({ title: 'Painel do sorteio · REB', robots: 'noindex, nofollow' })
const dashboard = ref<Dashboard>()
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const showContacts = ref(false)
const confirmClose = ref(false)
const dialog = ref<HTMLDialogElement>()
const resetDialog = ref<HTMLDialogElement>()
const resetSnapshot = ref<{ generation: number; total: number; winners: number }>()
const resetConfirmation = ref('')
const notice = ref('')
let polling: ReturnType<typeof setInterval>
const statusName = computed(() => ({ draft: 'Ainda não abertas', open: 'Inscrições abertas', closed: 'Inscrições encerradas' }[dashboard.value?.status ?? 'draft']))
async function load() {
  try { dashboard.value = await $fetch<Dashboard>('/api/admin/dashboard'); error.value = '' }
  catch (e: unknown) {
    if ((e as { statusCode?: number }).statusCode === 401) { await navigateTo('/admin/login'); return }
    error.value = 'Não conseguimos atualizar o painel. Tente novamente.'
  } finally { loading.value = false }
}
async function setState(status: 'open' | 'closed') {
  busy.value = true
  error.value = ''
  try { await $fetch('/api/admin/state', { method: 'POST', body: { status, generation: dashboard.value?.generation } }); await load(); dialog.value?.close(); confirmClose.value = false; notice.value = '' }
  catch (e: unknown) { error.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage ?? 'Não foi possível alterar as inscrições.' }
  finally { busy.value = false }
}
function askClose() { confirmClose.value = true; nextTick(() => dialog.value?.showModal()) }
async function askReset() {
  await load()
  if (!dashboard.value || error.value) return
  resetSnapshot.value = { generation: dashboard.value.generation, total: dashboard.value.total, winners: dashboard.value.winners.length }
  resetConfirmation.value = ''
  resetDialog.value?.showModal()
}
async function resetTests() {
  if (busy.value || resetConfirmation.value !== 'APAGAR TESTES' || !resetSnapshot.value) return
  busy.value = true
  error.value = ''
  try {
    await $fetch('/api/admin/reset', { method: 'POST', body: { ...resetSnapshot.value, confirmation: resetConfirmation.value } })
    showContacts.value = false
    resetDialog.value?.close()
    resetSnapshot.value = undefined
    await load()
    notice.value = 'Testes apagados. O painel está zerado. Clique em Abrir inscrições quando estiver pronto.'
  } catch (e: unknown) { error.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage ?? 'Não foi possível apagar. Atualize o painel e tente novamente.' }
  finally { busy.value = false }
}
async function logout() { await $fetch('/api/admin/logout', { method: 'POST', body: {} }); await navigateTo('/admin/login') }
onMounted(async () => { await load(); polling = setInterval(() => { if (!busy.value && document.visibilityState === 'visible') load() }, 15000) })
onBeforeUnmount(() => clearInterval(polling))
</script>
<template>
  <main class="admin-page"><header class="admin-header"><BrandMark /><span class="admin-badge">PAINEL DA ORGANIZAÇÃO</span><button class="text-button" @click="logout"><LogOut :size="16" /> Sair</button></header>
    <div class="admin-content"><div class="admin-heading"><div><p class="eyebrow">2ª CONFERÊNCIA TEOLÓGICA · 03 OUT 2026</p><h1>Painel<br><em>do sorteio.</em></h1></div><NuxtLink class="button button-secondary" to="/ensaio" target="_blank">Ensaiar a animação <ArrowUpRight :size="17" /></NuxtLink></div>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p><p v-if="notice" class="admin-notice" role="status">{{ notice }}</p><div v-if="loading" class="admin-loading"><LoaderCircle :size="24" class="spin" /> Carregando o painel…</div>
      <template v-if="dashboard"><div class="stats-grid"><article class="stat-card"><UsersRound :size="21" /><span>Inscrições confirmadas</span><strong>{{ dashboard.total }}</strong></article><article class="stat-card"><Gift :size="21" /><span>Livros sorteados</span><strong>{{ dashboard.winners.length }}<small> / 3</small></strong></article><article class="stat-card status-stat"><span class="status-dot" :class="{ active: dashboard.status === 'open' }" /><span>Status do formulário</span><strong>{{ statusName }}</strong><small>Atualização a cada 15 segundos</small></article></div>
        <section class="admin-action-card"><div class="action-icon"><Radio :size="26" /></div><div><h2>{{ dashboard.status === 'closed' ? 'Inscrições encerradas.' : 'Inscrições e transmissão.' }}</h2><p>{{ dashboard.status === 'closed' ? 'Abra a tela de apresentação e compartilhe somente essa aba na live.' : 'Abra as inscrições, divulgue o QR Code e encerre antes do primeiro sorteio.' }}</p></div><div class="admin-actions"><button v-if="dashboard.status !== 'open' && dashboard.winners.length === 0" class="button button-primary" :disabled="busy" @click="setState('open')"><UnlockKeyhole :size="17" /> {{ dashboard.status === 'draft' ? 'Abrir inscrições' : 'Reabrir inscrições' }}</button><button v-if="dashboard.status === 'open'" class="button button-primary" :disabled="busy || dashboard.total < 3" @click="askClose"><LockKeyhole :size="17" /> Encerrar inscrições</button><NuxtLink v-if="dashboard.status === 'closed'" class="button button-primary" to="/admin/palco" target="_blank"><MonitorPlay :size="18" /> Abrir tela do sorteio</NuxtLink></div></section>
        <p v-if="dashboard.status === 'open' && dashboard.total < 3" class="admin-hint">O encerramento fica disponível a partir de três inscrições.</p>
        <div class="admin-tools"><NuxtLink to="/gc" target="_blank">Abrir GC com QR Code <ArrowUpRight :size="16" /></NuxtLink><NuxtLink to="/gc?modo=tela" target="_blank">Convite em tela cheia <ArrowUpRight :size="16" /></NuxtLink><button class="text-button" @click="load"><RefreshCw :size="15" /> Atualizar agora</button></div>
        <section class="winners-admin"><div class="admin-section-title"><h2>Livros e ganhadores.</h2><span>{{ dashboard.winners.length ? 'Resultados salvos' : 'Aguardando o primeiro sorteio' }}</span></div><div class="admin-prizes"><article v-for="prize in prizes" :key="prize.id"><BookCover :cover="prize.cover" :title="prize.title" /><div><span class="eyebrow">LIVRO 0{{ prize.id }}</span><h3>{{ prize.title }}</h3><p v-if="dashboard.winners.find(w => w.prizeId === prize.id)"><CheckCircle2 :size="16" /> {{ dashboard.winners.find(w => w.prizeId === prize.id)?.name }}</p><p v-else class="waiting-winner">Ainda não sorteado</p></div></article></div></section>
        <section v-if="dashboard.winners.length" class="contacts-section"><div class="admin-section-title"><div><h2>Contato dos ganhadores</h2><p>Abra esta seção após encerrar o compartilhamento de tela.</p></div><button class="button button-secondary" @click="showContacts = !showContacts"><EyeOff v-if="showContacts" :size="17" /><Eye v-else :size="17" /> {{ showContacts ? 'Ocultar contatos' : 'Mostrar contatos' }}</button></div><div v-if="showContacts" class="contacts-table"><table><thead><tr><th>Ganhador</th><th>WhatsApp</th><th>E-mail</th><th>Livro</th></tr></thead><tbody><tr v-for="contact in dashboard.contacts" :key="contact.drawId"><td>{{ contact.name }}</td><td>{{ contact.whatsapp }}</td><td>{{ contact.email }}</td><td>{{ prizes[contact.prizeId - 1]?.title }}</td></tr></tbody></table><a class="text-button" href="/api/admin/export"><Download :size="17" /> Baixar contatos para o envio (CSV)</a></div></section>
        <section class="admin-reset"><div><h2>Apagar os testes</h2><p>Remove todas as inscrições e os resultados. Use antes de abrir o sorteio oficial.</p></div><button class="button button-reset" :disabled="busy" @click="askReset"><Trash2 :size="17" /> Apagar testes e zerar</button></section>
      </template>
    </div>
    <dialog ref="dialog" class="confirm-dialog" @close="confirmClose = false"><template v-if="confirmClose"><LockKeyhole :size="28" /><h2>Vamos encerrar<br><em>as inscrições?</em></h2><p>{{ dashboard?.total }} pessoas participarão. Ao começar o sorteio, as inscrições não poderão ser reabertas.</p><p v-if="error" role="alert" class="form-error">{{ error }}</p><div class="dialog-actions"><button class="button button-secondary" :disabled="busy" @click="dialog?.close()">Voltar</button><button class="button button-primary" :disabled="busy" @click="setState('closed')">{{ busy ? 'Encerrando…' : 'Sim, encerrar' }}</button></div></template></dialog>
    <dialog ref="resetDialog" class="confirm-dialog reset-dialog" aria-labelledby="reset-title" @cancel="busy && $event.preventDefault()"><form @submit.prevent="resetTests"><Trash2 :size="28" /><h2 id="reset-title">Apagar todos<br><em>os testes?</em></h2><p>Serão apagadas <strong>{{ resetSnapshot?.total }} inscrições</strong> e <strong>{{ resetSnapshot?.winners }} resultados</strong>. Não é possível desfazer pelo painel. As inscrições voltarão a ficar fechadas.</p><div class="field"><label for="reset-confirmation">Digite <strong>APAGAR TESTES</strong> para confirmar</label><input id="reset-confirmation" v-model="resetConfirmation" autocomplete="off" spellcheck="false" :disabled="busy" required /></div><p v-if="error" role="alert" class="form-error">{{ error }}</p><div class="dialog-actions"><button type="button" class="button button-secondary" :disabled="busy" @click="resetDialog?.close()">Cancelar</button><button class="button button-reset" :disabled="busy || resetConfirmation !== 'APAGAR TESTES'">{{ busy ? 'Apagando…' : 'Apagar e zerar' }}</button></div></form></dialog>
  </main>
</template>
