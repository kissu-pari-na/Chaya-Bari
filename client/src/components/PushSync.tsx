import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { syncPushSubscription } from '../lib/push'

/// Keeps this device's push subscription registered on the server whenever the
/// user is signed in and has already granted notification permission. Never
/// prompts (opt-in happens from the Profile control). Renders nothing.
export function PushSync() {
  const { user } = useAuth()
  useEffect(() => {
    if (user) void syncPushSubscription()
  }, [user])
  return null
}
