import type { GameState } from './game'

export function render(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { canvas } = ctx
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Draw balls
  for (const ball of state.balls) {
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
    ctx.fillStyle = ball.color
    ctx.fill()
    ctx.closePath()

    // Ball shine effect
    ctx.beginPath()
    ctx.arc(ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, ball.radius * 0.25, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.fill()
    ctx.closePath()
  }

  // Draw bucket
  const { bucket } = state
  ctx.fillStyle = '#4a90d9'
  ctx.strokeStyle = '#2c5f8a'
  ctx.lineWidth = 3

  // Bucket body (trapezoid shape)
  ctx.beginPath()
  ctx.moveTo(bucket.x + 10, bucket.y)
  ctx.lineTo(bucket.x + bucket.width - 10, bucket.y)
  ctx.lineTo(bucket.x + bucket.width, bucket.y + bucket.height)
  ctx.lineTo(bucket.x, bucket.y + bucket.height)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // Bucket rim
  ctx.fillStyle = '#2c5f8a'
  ctx.fillRect(bucket.x - 5, bucket.y - 5, bucket.width + 10, 8)
}
