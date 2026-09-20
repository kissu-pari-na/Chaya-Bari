import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { maybeAutoEnablePush, syncPushSubscription } from '../lib/push'

/// For a signed-in user: keeps this device's push subscription registered when
/// permission is already granted, and — so phone notifications are on by default
/// — auto-prompts to enable them once per browser when permission is still
/// undecided. Renders nothing.
export function PushSync() {
  const { user } = useAuth()
  useEffect(() => {
    if (!user) return
    void syncPushSubscription()
    void maybeAutoEnablePush()
  }, [user])
  return null
}
