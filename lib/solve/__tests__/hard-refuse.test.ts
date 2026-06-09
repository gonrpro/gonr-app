import { describe, expect, it } from 'vitest'
import { checkHardRefuseCombo } from '../hard-refuse'

describe('checkHardRefuseCombo', () => {
  it('hard-refuses Spanish nail-polish-on-acetate language in Spanish', () => {
    const card = checkHardRefuseCombo('esmalte de uñas', 'acetato', 'es')
    expect(card).not.toBeNull()
    expect(card?.title).toContain('No trate esto en casa')
    expect(card?.spottingProtocol[0].instruction).toContain('NO use acetona')
  })

  it('keeps the existing English hard-refuse path', () => {
    const card = checkHardRefuseCombo('nail polish', 'acetate', 'en')
    expect(card).not.toBeNull()
    expect(card?.title).toContain('Do Not Attempt at Home')
    expect(card?.spottingProtocol[0].instruction).toContain('DO NOT use acetone')
  })
})
