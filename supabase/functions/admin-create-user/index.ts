// Supabase Edge Function: a school admin creates a teacher, accountant, student or parent account.
// Runs with the service role, so it checks everything itself: caller must be a real admin (not a demo account).
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const ROLES = ['teacher', 'accountant', 'student', 'parent'] // admin is never created from the UI

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    })

    // 1) who is calling?
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: u, error: ue } = await admin.auth.getUser(token)
    if (ue || !u?.user) return json({ error: 'Please sign in again.' }, 401)
    const caller = u.user
    if ((caller.email ?? '').toLowerCase().endsWith('@schoolsync-demo.com')) {
      return json({ error: 'Demo accounts cannot create users. Sign in with a real admin account.' }, 403)
    }
    const { data: me } = await admin.from('ss_profiles').select('role, school_id').eq('id', caller.id).maybeSingle()
    if (!me || me.role !== 'admin' || !me.school_id) return json({ error: 'Only a school admin can create users.' }, 403)

    // 2) validate input
    const b = await req.json()
    const email = String(b.email ?? '').trim().toLowerCase()
    const password = String(b.password ?? '')
    const fullName = String(b.full_name ?? '').trim()
    const phone = String(b.phone ?? '').trim() || null
    const role = String(b.role ?? '')
    if (!ROLES.includes(role)) return json({ error: 'Role must be teacher, accountant, student or parent.' }, 400)
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'Enter a valid email.' }, 400)
    if (password.length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400)
    if (!fullName) return json({ error: 'Enter the full name.' }, 400)

    let studentIds: string[] = []
    if (role === 'student' && b.student_id) studentIds = [String(b.student_id)]
    if (role === 'parent' && Array.isArray(b.student_ids)) studentIds = b.student_ids.map(String)
    if (studentIds.length) {
      const { data: st } = await admin.from('ss_students').select('id, user_id')
        .in('id', studentIds).eq('school_id', me.school_id)
      if ((st ?? []).length !== studentIds.length) return json({ error: 'Some students were not found in your school.' }, 400)
      if (role === 'student' && st![0].user_id) return json({ error: 'This student already has an account.' }, 400)
    }

    // 3) create auth user, profile and links (undo the auth user if anything fails)
    const { data: created, error: ce } = await admin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name: fullName },
    })
    if (ce || !created?.user) return json({ error: ce?.message ?? 'Could not create the user.' }, 400)
    const id = created.user.id
    const undo = async (msg: string) => { await admin.auth.admin.deleteUser(id); return json({ error: msg }, 400) }

    const { error: pe } = await admin.from('ss_profiles')
      .insert({ id, school_id: me.school_id, role, full_name: fullName, phone, email })
    if (pe) return await undo(pe.message)

    if (role === 'student' && studentIds.length) {
      const { error } = await admin.from('ss_students').update({ user_id: id }).eq('id', studentIds[0])
      if (error) return await undo(error.message)
    }
    if (role === 'parent' && studentIds.length) {
      const { error } = await admin.from('ss_parent_student').insert(studentIds.map((sid) => ({ parent_id: id, student_id: sid })))
      if (error) return await undo(error.message)
    }

    return json({ id, email, role })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
