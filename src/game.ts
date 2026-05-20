export interface Ball {
  x: number
  y: number
  radius: number
  speed: number
  color: string
}

export interface Bucket {
  x: number
  y: number
  width: number
  height: number
}

export interface GameState {
  balls: Ball[]
  bucket: Bucket
  score: number
  isRunning: boolean
  spawnTimer: number
  difficulty: number
}

const BALL_COLORS = ['#e94560', '#f5a623', '#4ecdc4', '#a78bfa', '#34d399']

export function createInitialState(canvasWidth: number, canvasHeight: number): GameState {
  return {
    balls: [],
    bucket: {
      x: canvasWidth / 2 - 50,
      y: canvasHeight - 60,
      width: 100,
      height: 40,
    },
    score: 0,
    isRunning: false,
    spawnTimer: 0,
    difficulty: 1,
  }
}

export function spawnBall(canvasWidth: number, difficulty: number): Ball {
  const radius = 12 + Math.random() * 8
  return {
    x: radius + Math.random() * (canvasWidth - radius * 2),
    y: -radius,
    radius,
    speed: 2 + Math.random() * 2 + difficulty * 0.3,
    color: BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)]!,
  }
}

export function updateBalls(state: GameState, canvasHeight: number): GameState {
  const caughtBalls: Ball[] = []
  const activeBalls: Ball[] = []

  for (const ball of state.balls) {
    const updatedBall = { ...ball, y: ball.y + ball.speed }

    if (isCaught(updatedBall, state.bucket)) {
      caughtBalls.push(updatedBall)
    } else if (updatedBall.y - updatedBall.radius > canvasHeight) {
      // Ball fell off screen — missed
    } else {
      activeBalls.push(updatedBall)
    }
  }

  const newScore = state.score + caughtBalls.length
  const newDifficulty = 1 + Math.floor(newScore / 5) * 0.5

  return {
    ...state,
    balls: activeBalls,
    score: newScore,
    difficulty: newDifficulty,
  }
}

export function isCaught(ball: Ball, bucket: Bucket): boolean {
  return (
    ball.y + ball.radius >= bucket.y &&
    ball.y - ball.radius <= bucket.y + bucket.height &&
    ball.x >= bucket.x &&
    ball.x <= bucket.x + bucket.width
  )
}

export function moveBucket(state: GameState, mouseX: number): GameState {
  return {
    ...state,
    bucket: {
      ...state.bucket,
      x: mouseX - state.bucket.width / 2,
    },
  }
}
