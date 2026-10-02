<script setup lang="ts">
const props = defineProps<{ names: string[]; winner: string }>()
const emit = defineEmits<{ complete: [] }>()
const progress = ref(0)
const angle = ref(0)
const duration = 6400
const slots = computed(() => {
  const names = [...new Set(props.names.map(name => name.trim()).filter(Boolean))]
  return Array.from({ length: 12 }, (_, i) => ({
    angle: i * 30,
    name: i === 0 && progress.value > .88 ? props.winner.trim().split(/\s+/)[0]! : names[names.length >= 12 ? Math.floor(i * names.length / 12) : i % names.length] || `Inscrição ${String(i + 1).padStart(2, '0')}`,
  }))
})
let frame = 0
let hold: ReturnType<typeof setTimeout> | undefined
onMounted(() => {
  const start = performance.now()
  function tick(now: number) {
    progress.value = Math.min((now - start) / duration, 1)
    // Six full turns, with a gradual slowdown, land exactly on the saved winner.
    const eased = 1 - Math.pow(1 - progress.value, 3)
    angle.value = -2160 * eased
    if (progress.value < 1) frame = requestAnimationFrame(tick)
    else hold = setTimeout(() => emit('complete'), 500)
  }
  frame = requestAnimationFrame(tick)
})
onBeforeUnmount(() => { cancelAnimationFrame(frame); clearTimeout(hold) })
</script>

<template>
  <div class="name-reel" :class="{ 'reel-settled': progress === 1 }">
    <span class="reel-announcement">Os nomes estão passando. O ganhador será anunciado ao final.</span>
    <div class="reel-window" aria-hidden="true">
      <div class="reel-focus" />
      <div class="reel-scene">
        <div class="reel-cylinder" :style="{ transform: `rotateX(${angle}deg)` }">
          <div v-for="(slot, i) in slots" :key="i" class="reel-name" :class="{ 'reel-winner': i === 0 && progress > .88 }" :style="{ transform: `rotateX(${slot.angle}deg) translateZ(164px)` }">{{ slot.name }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.name-reel{width:100%;max-width:660px;margin-top:20px}
.reel-announcement{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.reel-window{position:relative;height:350px;overflow:hidden}
.reel-scene{position:absolute;inset:0;perspective:1200px;perspective-origin:50% 50%;mask-image:linear-gradient(transparent,#0003 12%,#000 38%,#000 62%,#0003 88%,transparent)}
.reel-cylinder{position:absolute;top:calc(50% - 43px);left:35px;right:35px;height:86px;transform-style:preserve-3d;will-change:transform}
.reel-name{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-size:clamp(42px,4.6vw,70px);font-weight:500;line-height:1.05;letter-spacing:-.6px;color:var(--cream);text-align:center;backface-visibility:hidden;overflow-wrap:anywhere;padding:0 14px;transition:color .4s}
.reel-winner{color:var(--gold-light)}
.reel-focus{position:absolute;top:calc(50% - 64px);left:0;right:0;height:128px;z-index:2;pointer-events:none}
.reel-focus:before,.reel-focus:after{content:'';position:absolute;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,#e4be7260 25%,#e4be7299 50%,#e4be7260 75%,transparent);transition:opacity .4s}
.reel-focus:before{top:0}.reel-focus:after{bottom:0}
.reel-settled .reel-name.reel-winner{text-shadow:0 0 40px #e4be7230}
.reel-settled .reel-focus:before,.reel-settled .reel-focus:after{opacity:.45}
@media(max-width:740px){.name-reel{max-width:460px;margin:12px auto 0}.reel-window{height:290px}.reel-cylinder{left:12px;right:12px}.reel-name{font-size:40px;padding-inline:6px}.reel-focus{height:112px;top:calc(50% - 56px)}}
</style>
