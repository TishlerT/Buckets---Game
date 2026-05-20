import { describe, it, expect } from 'vitest'
import { createInitialState, isCaught, moveBucket, spawnBall, updateBalls } from './game'

describe('createInitialState', () => {
  it('creates state with correct canvas dimensions', () => {
    const state = createInitialState(800, 600)
    expect(state.score).toBe(0)
    expect(state.isRunning).toBe(false)
    expect(state.balls).toHaveLength(0)
    expect(state.bucket.width).toBe(100)
    expect(state.bucket.x).toBe(350)
  })
})

describe('spawnBall', () => {
  it('creates ball within canvas bounds', () => {
    const ball = spawnBall(800, 1)
    expect(ball.x).toBeGreaterThan(0)
    expect(ball.x).toBeLessThan(800)
    expect(ball.y).toBeLessThanOrEqual(0)
    expect(ball.speed).toBeGreaterThan(0)
    expect(ball.radius).toBeGreaterThanOrEqual(12)
  })
})

describe('isCaught', () => {
  it('returns true when ball overlaps bucket', () => {
    const ball = { x: 400, y: 550, radius: 15, speed: 3, color: '#e94560' }
    const bucket = { x: 350, y: 540, width: 100, height: 40 }
    expect(isCaught(ball, bucket)).toBe(true)
  })

  it('returns false when ball is above bucket', () => {
    const ball = { x: 400, y: 100, radius: 15, speed: 3, color: '#e94560' }
    const bucket = { x: 350, y: 540, width: 100, height: 40 }
    expect(isCaught(ball, bucket)).toBe(false)
  })

  it('returns false when ball is to the left of bucket', () => {
    const ball = { x: 50, y: 550, radius: 15, speed: 3, color: '#e94560' }
    const bucket = { x: 350, y: 540, width: 100, height: 40 }
    expect(isCaught(ball, bucket)).toBe(false)
  })
})

describe('updateBalls', () => {
  it('moves balls downward', () => {
    const state = createInitialState(800, 600)
    const ball = { x: 400, y: 100, radius: 15, speed: 3, color: '#e94560' }
    const stateWithBall = { ...state, balls: [ball] }
    const updated = updateBalls(stateWithBall, 600)
    expect(updated.balls[0]!.y).toBe(103)
  })

  it('increases score when ball is caught', () => {
    const state = createInitialState(800, 600)
    const ball = { x: 400, y: 538, radius: 15, speed: 5, color: '#e94560' }
    const stateWithBall = { ...state, balls: [ball] }
    const updated = updateBalls(stateWithBall, 600)
    expect(updated.score).toBe(1)
    expect(updated.balls).toHaveLength(0)
  })

  it('removes balls that fall off screen', () => {
    const state = createInitialState(800, 600)
    const ball = { x: 400, y: 620, radius: 15, speed: 3, color: '#e94560' }
    const stateWithBall = { ...state, balls: [ball] }
    const updated = updateBalls(stateWithBall, 600)
    expect(updated.balls).toHaveLength(0)
    expect(updated.score).toBe(0)
  })
})

describe('moveBucket', () => {
  it('centers bucket on mouse position', () => {
    const state = createInitialState(800, 600)
    const moved = moveBucket(state, 300)
    expect(moved.bucket.x).toBe(250)
  })
})
