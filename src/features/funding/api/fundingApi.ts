import { supabase } from '@/shared/services/supabase'
export interface PublicAdoptionRow {
  id: string
  language_entity_id: string | null
  language_name?: string | null
  estimated_budget_cents: number | null
  currency_code?: string | null
  status: 'draft' | 'available' | 'on_hold' | 'funded' | 'archived' | null
}

export async function listAvailableLanguages(params?: { status?: string; limit?: number; offset?: number }) {
  const statusFilter = (params?.status ?? 'available') as PublicAdoptionRow['status']
  const limit = params?.limit ?? 100
  const offset = params?.offset ?? 0

  const query = supabase
    .from('language_adoptions')
    .select('id, language_entity_id, estimated_budget_cents, status, language_entities(name)')
    .eq('status', statusFilter as any)
    .order('estimated_budget_cents', { ascending: false })
    .range(offset, offset + limit - 1)

  const { data, error } = await query
  if (error) throw new Error(error.message || 'Failed to list available languages')

  const items: PublicAdoptionRow[] = (data ?? []).map((row: any) => ({
    id: row.id,
    language_entity_id: row.language_entity_id,
    language_name: row.language_entities?.name ?? null,
    estimated_budget_cents: row.estimated_budget_cents ?? null,
    status: row.status ?? null,
  }))
  return items
}

export async function createLead(payload: {
  firstName: string
  lastName: string
  email: string
  phone?: string
  intent: 'ops' | 'adopt'
  languageIds?: string[]
}) {
  const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
  const body = { firstName: payload.firstName, lastName: payload.lastName, email: payload.email, phone: payload.phone, source: payload.intent }
  // Non-blocking CRM intake
  fetch(`${base}/crm-lead-intake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => undefined)
  return { ok: true }
}

export async function createSponsorshipCheckout(payload: {
  purpose: 'operations' | 'adoption'
  adoptionIds?: string[]
  donor: { firstName: string; lastName: string; email: string; phone?: string }
  mode: 'card' | 'bank_transfer'
  donateOnlyCents?: number
}) {
  const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
  const res = await fetch(`${base}/create-sponsorship-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    let message = 'Failed to create checkout'
    try { const j = await res.json(); if (j?.message) message = j.message } catch (e) {
      console.error('Failed to create checkout', e)
    }
    throw new Error(message)
  }
  const json = await res.json()
  const data = json && typeof json === 'object' && 'data' in json ? (json as any).data : json
  return data as { customerId?: string; depositClientSecret?: string | null; clientSecret?: string | null; subscriptionId?: string | null; adoptionSummaries?: Array<{ id: string; name: string; depositCents: number; recurringCents: number }> }
}



