'use client'

// TASK-182 — Edit Profile client island.
//
// Maps the server-side UserPlant shape (camelCase from getUserPlant) to the
// snake_case ExistingPlant shape PlantWizardModal expects, then reopens the
// wizard in edit mode. On completion, router.refresh() so the server-rendered
// profile re-reads from /api/plant.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PlantWizardModal, { type ExistingPlant } from '@/components/wizard/PlantWizardModal'
import type { UserPlant } from '@/lib/auth/getUserPlant'

function toExistingPlant(plant: UserPlant): ExistingPlant {
  return {
    id: plant.plantId,
    name: plant.name,
    solvents: plant.solvents,
    solvent_other: plant.solventOther,
    board: plant.board,
    skill_level: plant.skillLevel,
    bleach_allowed: plant.bleachAllowed,
    house_rules: plant.houseRules,
  }
}

export function EditProfileButton({ plant }: { plant: UserPlant }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const canEdit = plant.role === 'owner'

  if (!canEdit) return null

  return (
    <>
      <button type="button" className="sb-link-button" onClick={() => setOpen(true)}>
        Edit
      </button>
      <PlantWizardModal
        open={open}
        onClose={() => setOpen(false)}
        onComplete={() => {
          setOpen(false)
          router.refresh()
        }}
        existingPlant={toExistingPlant(plant)}
      />
    </>
  )
}
