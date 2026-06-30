declare module 'koa-router' {
  import type { Middleware } from 'koa'

  class Router {
    constructor(opts?: any)
    get(path: string | RegExp, ...middleware: Middleware[]): Router
    post(path: string | RegExp, ...middleware: Middleware[]): Router
    put(path: string | RegExp, ...middleware: Middleware[]): Router
    delete(path: string | RegExp, ...middleware: Middleware[]): Router
    patch(path: string | RegExp, ...middleware: Middleware[]): Router
    routes(): Middleware
    allowedMethods(): Middleware
  }

  export = Router
}
