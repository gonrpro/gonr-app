'use client'

import { ShoppingBag } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

// TASK-218 SHARED FOUNDATION — consumer/household product rail.
// Re-skin of ResultCard's products section. Renders card.products.consumer and
// card.products.household ONLY — never products.professional (the server strips
// it for anon/free/home tiers; this component never re-adds it). Household-first
// ordering ahead of any branded SKU. Renders only when non-empty (no "Coming
// soon" placeholder). All copy (name/use/note) is engine-provided — authors none.

export interface ProductItem {
  name: string
  use?: string
  note?: string
}

export interface ProductsListProps {
  consumer?: ReadonlyArray<ProductItem>
  household?: ReadonlyArray<ProductItem>
  className?: string
}

export default function ProductsList({ consumer, household, className }: ProductsListProps) {
  const { t } = useLanguage()
  // Household-first, then branded consumer SKUs.
  const items: ProductItem[] = [...(household ?? []), ...(consumer ?? [])].filter(
    (item) => item.name.trim().length > 0,
  )
  if (items.length === 0) return null

  return (
    <section className={className} aria-label={t('products.sectionAria')}>
      <div className="mb-3 flex items-center gap-2">
        <p className="text-sm font-extrabold uppercase tracking-wide text-gonr-textgray">{t('products.heading')}</p>
        <span className="rounded-full bg-gonr-lightgray px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gonr-textgray">
          {t('products.optionalBadge')}
        </span>
      </div>
      <ul className="grid gap-2">
        {items.map((item, index) => (
          <li key={`${item.name}-${index}`} className="gonr-card flex items-start gap-3 p-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gonr-softpink text-gonr-hotpink">
              <ShoppingBag size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-extrabold leading-tight text-gonr-navy">{item.name}</p>
              {item.use ? <p className="mt-0.5 text-sm leading-5 text-gonr-textgray">{item.use}</p> : null}
              {item.note ? <p className="mt-0.5 text-sm italic leading-5 text-gonr-textgray">{item.note}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
