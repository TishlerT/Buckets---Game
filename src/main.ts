import { createInitialState, moveBucket, spawnBall, updateBalls } from './game'
import { render } from './renderer'

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!
const startBtn = document.getElementById('start-btn') as HTMLButtonElement
const scoreEl = document.getElementById('score') as HTMLSpanElement

let state = createInitialState(canvas.width, canvas.height)
let animationId: number | null = null
const SPAWN_INTERVAL = 60 // frames

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  state = moveBucket(state, mouseX)
})

function gameLoop(): void {
  if (!state.isRunning) return

  state = { ...state, spawnTimer: state.spawnTimer + 1 }

  const spawnRate = Math.max(20, SPAWN_INTERVAL - state.difficulty * 5)
  if (state.spawnTimer >= spawnRate) {
    state = {
      ...state,
      balls: [...state.balls, spawnBall(canvas.width, state.difficulty)],
      spawnTimer: 0,
    }
  }

  state = updateBalls(state, canvas.height)
  scoreEl.textContent = String(state.score)

  render(ctx, state)
  animationId = requestAnimationFrame(gameLoop)
}

startBtn.addEventListener('click', () => {
  state = { ...createInitialState(canvas.width, canvas.height), isRunning: true }
  scoreEl.textContent = '0'
  startBtn.disabled = true

  if (animationId !== null) {
    cancelAnimationFrame(animationId)
  }
  animationId = requestAnimationFrame(gameLoop)

  setTimeout(() => {
    startBtn.disabled = false
  }, 1000)
})

render(ctx, state)
