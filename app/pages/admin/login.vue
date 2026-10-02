<script setup lang="ts">
import { ArrowLeft, ArrowRight, LoaderCircle, LockKeyhole } from '@lucide/vue'
useSeoMeta({ title: 'Acesso da organização · REB', robots: 'noindex, nofollow' })
const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)
const ready = ref(false)
onMounted(() => { ready.value = true })
async function login() {
  if (!ready.value || busy.value) return
  busy.value = true
  error.value = ''
  try {
    await $fetch('/api/admin/login', { method: 'POST', body: { email: email.value, password: password.value } })
    await navigateTo('/admin')
  } catch (e: unknown) {
    error.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage ?? 'Não foi possível entrar. Tente novamente.'
  } finally { busy.value = false; password.value = '' }
}
</script>
<template>
  <main class="login-page textured"><div class="login-card"><BrandMark /><div class="login-icon"><LockKeyhole :size="23" /></div><p class="eyebrow">ÁREA DA ORGANIZAÇÃO</p><h1>Acesso da<br><em>organização.</em></h1><p class="form-intro">Entre para acompanhar as inscrições e fazer os sorteios.</p><form @submit.prevent="login"><fieldset :disabled="!ready || busy"><div class="field"><label for="admin-email">E-mail</label><input id="admin-email" v-model="email" type="email" autocomplete="username" required placeholder="Seu e-mail de acesso"></div><div class="field"><label for="admin-password">Senha</label><input id="admin-password" v-model="password" type="password" autocomplete="current-password" required placeholder="Sua senha"></div><p v-if="error" role="alert" class="form-error">{{ error }}</p><button class="button button-primary" :disabled="!ready || busy"><LoaderCircle v-if="busy" :size="18" class="spin" /><template v-else>Entrar no painel<ArrowRight :size="18" /></template></button></fieldset></form><NuxtLink class="back-link" to="/"><ArrowLeft :size="16" /> Voltar para o site</NuxtLink></div></main>
</template>
