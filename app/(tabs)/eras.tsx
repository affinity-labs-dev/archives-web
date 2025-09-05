// Eras Tab - Redirects to consolidated era-selection page
// This eliminates code duplication by using a single era selection component

import { useEffect } from 'react'
import { useRouter } from 'expo-router'

export default function ErasTab() {
  const router = useRouter()

  useEffect(() => {
    // Immediately redirect to the consolidated era selection page
    router.replace('/era-selection')
  }, [router])

  // Return null since we're redirecting immediately
  return null
}