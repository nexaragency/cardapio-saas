import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export function usePlan() {
  const [plan, setPlan] = useState(null)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [trialDaysLeft, setTrialDaysLeft] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: userData } = await supabase
        .from('users').select('tenant_id').eq('id', user.id).single()
      if (!userData) { setLoading(false); return }

      const { data: sub } = await supabase
        .from('subscriptions').select('*')
        .eq('tenant_id', userData.tenant_id).single()

      if (sub) {
        setPlan(sub.plan_name || 'starter')

        if (sub.status === 'trial' && sub.trial_ends_at) {
          const trialEnd = new Date(sub.trial_ends_at)
          const now = new Date()
          const diff = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))
          if (diff <= 0) {
            setStatus('overdue')
          } else {
            setStatus('trial')
            setTrialDaysLeft(diff)
          }
        } else {
          setStatus(sub.status || 'pending')
        }
      }

      setLoading(false)
    }
    load()
  }, [])

  function hasAccess(feature) {
    if (status === 'pending' || status === 'overdue' || status === 'cancelled') return false

    if (status === 'trial') return true

    if (status === 'active') {
      if (feature === 'delivery') return true
      if (feature === 'relatorios') return true
      if (feature === 'salao') return plan === 'pro' || plan === 'premium'
      if (feature === 'historico') return plan === 'pro' || plan === 'premium'
      if (feature === 'cores') return plan === 'premium'
      if (feature === 'pdf') return plan === 'premium'
      if (feature === 'destaques') return plan === 'premium'
    }

    return false
  }

  function canAccess() {
    return status === 'active' || status === 'trial'
  }

  return { plan, status, loading, hasAccess, canAccess, trialDaysLeft }
}