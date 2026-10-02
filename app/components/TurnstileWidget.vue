<script setup lang="ts">
const emit = defineEmits<{ verified: [token: string] }>()
const config = useRuntimeConfig()
const container = ref<HTMLElement>()
const problem = ref('')
let widgetId: string | undefined
type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string
  reset: (id: string) => void
  remove: (id: string) => void
}
declare global { interface Window { turnstile?: Turnstile } }

function renderWidget() {
  if (!container.value || !window.turnstile || widgetId) return
  widgetId = window.turnstile.render(container.value, {
    sitekey: config.public.turnstileSiteKey,
    action: 'register', theme: 'light', size: 'flexible', language: 'pt-br',
    callback: (token: string) => { problem.value = ''; emit('verified', token) },
    'expired-callback': () => emit('verified', ''),
    'error-callback': () => { emit('verified', ''); problem.value = 'Não foi possível verificar sua conexão. Recarregue a página e tente novamente.' },
  })
}

onMounted(() => {
  if (!config.public.turnstileSiteKey) return
  if (window.turnstile) { renderWidget(); return }
  let script = document.querySelector<HTMLScriptElement>('script[data-turnstile]')
  if (!script) {
    script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.dataset.turnstile = 'true'
    document.head.appendChild(script)
  }
  script.addEventListener('load', renderWidget, { once: true })
  script.addEventListener('error', () => { problem.value = 'A verificação não carregou. Recarregue a página.' }, { once: true })
})
onBeforeUnmount(() => { if (widgetId) window.turnstile?.remove(widgetId) })
defineExpose({ reset: () => { emit('verified', ''); if (widgetId) window.turnstile?.reset(widgetId) } })
</script>

<template>
  <div class="verification"><div ref="container" /><p v-if="problem" class="field-error" role="alert">{{ problem }}</p></div>
</template>
