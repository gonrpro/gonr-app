#!/usr/bin/env node

/**
 * Integration test: acid + marble via solve endpoint
 * Should return SAFE_FALLBACK, not dangerous output
 */

const apiUrl = process.env.API_URL || 'http://localhost:3000'

async function testAcidMarble() {
  console.log('🧪 Testing acid + marble safety filter...\n')

  try {
    const response = await fetch(`${apiUrl}/api/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stain: 'mineral deposits',
        surface: 'marble countertop',
        lang: 'en',
      }),
    })

    const data = await response.json()

    console.log('Response status:', response.status)
    console.log('Response source:', data.source)
    console.log('\n📋 Card returned:')
    console.log(JSON.stringify(data.card, null, 2))

    if (data.source === 'safety-blocked') {
      console.log('\n✅ PASS: Safety filter blocked acid+marble combo')
      console.log('Violations:', data.violations)
      return true
    } else if (data.card._safetyBlocked) {
      console.log('\n✅ PASS: SAFE_FALLBACK returned for acid+marble combo')
      return true
    } else if (
      data.card.title === 'Professional Assessment Required' ||
      data.card.escalation?.includes('professional cleaner')
    ) {
      console.log('\n✅ PASS: Safe fallback protocol returned')
      return true
    } else {
      console.log('\n❌ FAIL: Dangerous protocol returned!')
      console.log('Card should be SAFE_FALLBACK or safety-blocked, but got:', data.source)
      return false
    }
  } catch (err) {
    console.error('❌ Test error:', err.message)
    return false
  }
}

testAcidMarble().then((passed) => {
  process.exit(passed ? 0 : 1)
})
