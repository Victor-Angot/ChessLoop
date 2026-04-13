import type { ChessLine, Repertoire } from '../types/chess.types'
import { apiUrl } from './authApi'

function mapTrainerError(status: number, body: string): Error {
  if (status === 401) return new Error('Session expired. Sign in again.')
  try {
    const j = JSON.parse(body) as { error?: string }
    if (j.error) return new Error(j.error)
  } catch {
    /* ignore */
  }
  return new Error('Trainer request failed.')
}

async function trainerFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(apiUrl(path), {
      credentials: 'include',
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })
  } catch (e) {
    if (e instanceof TypeError) {
      const m = e.message.toLowerCase()
      if (m.includes('fetch') || m.includes('network') || m.includes('failed')) {
        return Promise.reject(
          new Error(
            'Cannot reach the server. For local dev run the API (`npm run dev` or `npm run dev:server`).',
          ),
        )
      }
    }
    throw e
  }
}

export async function fetchTrainerSnapshot(): Promise<{
  lines: ChessLine[]
  repertoires: Repertoire[]
}> {
  const r = await trainerFetch('/api/trainer/snapshot')
  const text = await r.text()
  if (!r.ok) throw mapTrainerError(r.status, text)
  if (!text) return { lines: [], repertoires: [] }
  return JSON.parse(text) as { lines: ChessLine[]; repertoires: Repertoire[] }
}

export async function putTrainerRepertoires(repertoires: Repertoire[]): Promise<void> {
  const r = await trainerFetch('/api/trainer/repertoires', {
    method: 'PUT',
    body: JSON.stringify({ repertoires }),
  })
  const text = await r.text()
  if (!r.ok) throw mapTrainerError(r.status, text)
}

export async function putTrainerLines(lines: ChessLine[]): Promise<void> {
  const r = await trainerFetch('/api/trainer/lines', {
    method: 'PUT',
    body: JSON.stringify({ lines }),
  })
  const text = await r.text()
  if (!r.ok) throw mapTrainerError(r.status, text)
}

export async function deleteTrainerRepertoireRemote(id: string): Promise<void> {
  const r = await trainerFetch(`/api/trainer/repertoires/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  const text = await r.text()
  if (!r.ok) throw mapTrainerError(r.status, text)
}
