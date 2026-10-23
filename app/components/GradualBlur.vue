<script setup>
import { computed } from 'vue'

const props = defineProps({
  position: {
    type: String,
    default: 'bottom',
  },
  height: {
    type: String,
    default: '6rem',
  },
  strength: {
    type: Number,
    default: 2,
  },
  divCount: {
    type: Number,
    default: 5,
  },
  opacity: {
    type: Number,
    default: 1,
  },
  zIndex: {
    type: Number,
    default: 12,
  },
  target: {
    type: String,
    default: 'parent',
  },
  curve: {
    type: String,
    default: 'bezier',
  },
  exponential: {
    type: Boolean,
    default: false,
  },
})

const CURVE_FUNCTIONS = {
  linear: (p) => p,
  bezier: (p) => p * p * (3 - 2 * p),
  'ease-in': (p) => p * p,
  'ease-out': (p) => 1 - Math.pow(1 - p, 2),
  'ease-in-out': (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
}

const pointToDirection = {
  top: 'to top',
  bottom: 'to bottom',
  left: 'to left',
  right: 'to right',
}

const baseDirection = computed(() => pointToDirection[props.position] || 'to bottom')

const blurSlices = computed(() => {
  const count = Math.max(1, props.divCount)
  const divs = []
  const increment = 100 / count
  const curve = CURVE_FUNCTIONS[props.curve] || CURVE_FUNCTIONS.linear

  for (let index = 1; index <= count; index += 1) {
    let progress = index / count
    progress = curve(progress)

    const blurValue = props.exponential
      ? Math.pow(2, progress * 4) * 0.0625 * props.strength
      : 0.0625 * (progress * count + 1) * props.strength

    const start = Math.round((increment * index - increment) * 10) / 10
    const middle = Math.round(increment * index * 10) / 10
    const end = Math.round((increment * index + increment) * 10) / 10
    const tail = Math.round((increment * index + increment * 2) * 10) / 10

    const gradient = `linear-gradient(${baseDirection.value}, transparent ${start}%, rgba(0,0,0,0.22) ${middle}%, rgba(0,0,0,0.72) ${end}%, rgba(0,0,0,1) ${Math.min(tail, 100)}%, rgba(0,0,0,1) 100%)`

    divs.push({
      '--blur': `${blurValue.toFixed(3)}rem`,
      maskImage: gradient,
      WebkitMaskImage: gradient,
      opacity: props.opacity,
      background: 'linear-gradient(' + baseDirection.value + ', rgba(0,0,0,0) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.3) 100%)',
    })
  }

  return divs
})

const containerStyle = computed(() => {
  const isVertical = ['top', 'bottom'].includes(props.position)
  const isHorizontal = ['left', 'right'].includes(props.position)

  const style = {
    position: props.target === 'page' ? 'fixed' : 'absolute',
    pointerEvents: 'none',
    zIndex: props.zIndex,
  }

  if (isVertical) {
    style.height = props.height
    style.width = '100%'
    style.left = 0
    style.right = 0
    style[props.position] = 0
  } else if (isHorizontal) {
    style.width = props.height
    style.height = '100%'
    style.top = 0
    style.bottom = 0
    style[props.position] = 0
  }

  return style
})
</script>

<template>
  <div class="gradual-blur" :style="containerStyle" aria-hidden="true">
    <div class="gradual-blur-inner">
      <div
        v-for="(slice, index) in blurSlices"
        :key="index"
        class="gradual-blur-slice"
        :style="slice"
      />
    </div>
  </div>
</template>

<style scoped>
.gradual-blur {
  overflow: hidden;
  pointer-events: none;
}

.gradual-blur-inner {
  position: relative;
  width: 100%;
  height: 100%;
}

.gradual-blur-slice {
  position: absolute;
  inset: 0;
  backdrop-filter: blur(var(--blur));
  -webkit-backdrop-filter: blur(var(--blur));
  background: rgba(255, 255, 255, 0.02);
}
</style>
