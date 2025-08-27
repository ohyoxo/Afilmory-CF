/**
 * Worker 上下文
 * 提供环境变量、存储绑定和执行上下文的统一访问接口
 */

import type { Env } from '../index'

export interface WorkerContext {
  env: Env
  ctx: ExecutionContext
}

export function createContext(env: Env, ctx: ExecutionContext): WorkerContext {
  return {
    env,
    ctx
  }
}