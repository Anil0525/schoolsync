import { supabase } from './supabaseClient'

// Calls the admin-create-user Edge Function. Throws Error with a readable message.
export async function createUser(payload) {
  const { data, error } = await supabase.functions.invoke('admin-create-user', { body: payload })
  if (error) {
    let msg = error.message
    try {
      const j = await error.context.json()
      if (j?.error) msg = j.error
    } catch { /* keep the default message */ }
    if (/failed to send|fetch/i.test(msg)) msg = 'Could not reach the server function. Is admin-create-user deployed in Supabase?'
    throw new Error(msg)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

export function genPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const a = new Uint32Array(10)
  crypto.getRandomValues(a)
  return Array.from(a, (n) => chars[n % chars.length]).join('') + '@7'
}
