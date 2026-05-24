'use client'

import { useEffect } from 'react'

// Toggles a body class so the consumer shell can suppress the app's global
// header/footer/nav and own the full viewport (native-PWA feel). Mirrors the
// existing plant-brain-shell pattern in globals.css.
export default function ConsumerShellChrome() {
  useEffect(() => {
    document.body.classList.add('gonr-consumer-shell')
    return () => document.body.classList.remove('gonr-consumer-shell')
  }, [])
  return null
}
