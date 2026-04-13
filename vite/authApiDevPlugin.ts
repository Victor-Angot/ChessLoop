import { spawn, type ChildProcess } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

const require = createRequire(import.meta.url)
const pluginDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(pluginDir, '..')

let child: ChildProcess | null = null
let shutdownHooked = false

function stopApi(): void {
  if (child && !child.killed) {
    child.kill('SIGTERM')
    child = null
  }
}

function hookProcessShutdown(): void {
  if (shutdownHooked) return
  shutdownHooked = true
  const shutdown = () => {
    stopApi()
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}

export function authApiDevPlugin(): Plugin {
  return {
    name: 'auth-api-dev',
    apply: 'serve',
    configureServer(server) {
      if (process.env.VITE_AUTH_API_DISABLED === '1') {
        return
      }

      const tsxDir = path.dirname(require.resolve('tsx/package.json'))
      const tsxCli = path.join(tsxDir, 'dist', 'cli.mjs')
      const entry = path.join(projectRoot, 'server', 'index.ts')

      stopApi()
      child = spawn(
        process.execPath,
        [tsxCli, 'watch', entry],
        {
          cwd: projectRoot,
          stdio: 'inherit',
          env: { ...process.env },
        },
      )

      child.on('exit', (code, signal) => {
        child = null
        if (code !== 0 && code !== null && signal !== 'SIGTERM') {
          console.error(
            `[auth-api-dev] API server exited with code ${String(code)}. Check JWT_SECRET in .env (see env.example).`,
          )
        }
      })

      hookProcessShutdown()
      server.httpServer?.once('close', () => {
        stopApi()
      })
    },
  }
}
