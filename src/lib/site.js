import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

let cache = null

// The published school website content (null when the admin has not published it yet)
export function usePublicSite() {
  const [state, setState] = useState(cache ? { site: cache.site, loading: false, error: '' } : { site: null, loading: true, error: '' })
  useEffect(() => {
    if (cache) return
    let live = true
    supabase.rpc('ss_public_site').then(({ data, error }) => {
      if (!live) return
      if (error) {
        const missing = /does not exist|schema cache|Could not find/.test(error.message)
        setState({ site: null, loading: false, error: missing ? 'The website is not set up yet. Run 027_public_site.sql in Supabase.' : error.message })
      } else {
        cache = { site: data || null }
        setState({ site: data || null, loading: false, error: '' })
      }
    })
    return () => { live = false }
  }, [])
  return state
}

export const lines = (text) => (text || '').split('\n').map((l) => l.trim()).filter(Boolean)

export async function submitEnquiry(f) {
  const { error } = await supabase.rpc('ss_submit_enquiry', {
    p_child: f.child, p_class: f.cls, p_parent: f.parent, p_phone: f.phone, p_email: f.email || '', p_message: f.message || '',
  })
  return error ? error.message : ''
}
