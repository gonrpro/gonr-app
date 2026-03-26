'use client'

import { useState } from 'react'
import crosswalkData from '@/data/chemicals/agent-brand-crosswalk.json'
import fiberData from '@/data/chemicals/fiber-expertise-index.json'

// Company imports
import rrStreet from '@/data/chemicals/companies/rr-street.json'
import kreussler from '@/data/chemicals/companies/kreussler.json'
import alWilson from '@/data/chemicals/companies/al-wilson.json'
import adco from '@/data/chemicals/companies/adco.json'
import pariser from '@/data/chemicals/companies/pariser.json'
import seitz from '@/data/chemicals/companies/seitz.json'
import royaltone from '@/data/chemicals/companies/royaltone.json'
import bufa from '@/data/chemicals/companies/bufa.json'
import greenearth from '@/data/chemicals/companies/greenearth.json'
import nationalChemical from '@/data/chemicals/companies/national-chemical.json'

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'agent' | 'company' | 'fiber'

interface CrosswalkProduct {
  company: string
  productName: string
  notes: string
}

interface CrosswalkAgent {
  genericName: string
  description: string
  mechanism: string
  safetyWarning?: string
  products: CrosswalkProduct[]
}

interface CompanyData {
  id: string
  name: string
  slug: string
  website: string
  headquarters: string
  founded: string
  employeeRange?: string
  overview: {
    summary: string
    historyAndReputation: string
    marketPosition?: string
  }
  specialties: string[]
  productLines: {
    category: string
    categoryDescription?: string
    products: {
      name: string
      type?: string
      description: string
      usedFor?: string[]
      fibers?: string[]
      notFor?: string[]
      proTips?: string
      alternativeTo?: string
      priceTier?: string
      availability?: string
    }[]
  }[]
  agentMapping: Record<string, string>
  fiberExpertise: Record<string, string>
  distributionNetwork?: {
    regions?: string[]
    distributionMethod?: string
    howToBuy?: string
    majorDistributors?: string[]
  }
  gonrIntegration: {
    relevance: string
    agentCrossReference?: string
    whenToRecommend?: string
  }
  links?: Record<string, string>
  lastResearched?: string
}

interface FiberEntry {
  description: string
  keyConsiderations: string[]
  recommendedCompanies: {
    company: string
    why: string
    products: string[]
  }[]
  agentsToUse: string[]
  agentsToAvoid: string[]
}

// ─── Data ────────────────────────────────────────────────────────────────────

const companies: CompanyData[] = [
  rrStreet, kreussler, alWilson, adco, pariser,
  seitz, royaltone, bufa, greenearth, nationalChemical,
] as CompanyData[]

const crosswalk = crosswalkData as unknown as Record<string, CrosswalkAgent>
const fibers = fiberData as unknown as Record<string, FiberEntry>

// Agent categories in display order
const AGENT_KEYS = [
  'NSD', 'POG', 'protein', 'tannin', 'leveling',
  'rustRemover', 'enzymatic', 'solvent', 'oxidizingBleach',
  'reducingAgent', 'wetCleaningDetergent', 'finishingAgent',
] as const

const AGENT_ICONS: Record<string, string> = {
  NSD: '🧴', POG: '🛢️', protein: '🥩', tannin: '🍷',
  leveling: '💧', rustRemover: '🔩', enzymatic: '🧬', solvent: '⚗️',
  oxidizingBleach: '☀️', reducingAgent: '⚡', wetCleaningDetergent: '🫧',
  finishingAgent: '✨',
}

// Fiber config
const FIBER_KEYS = [
  'silk', 'wool', 'cashmere', 'leather',
  'suede', 'acetate', 'polyester', 'cotton',
  'linen', 'nylon', 'alcantara', 'denim',
] as const

const FIBER_ICONS: Record<string, string> = {
  silk: '🪡', wool: '🐑', cashmere: '🧣', leather: '🧥',
  suede: '👞', acetate: '🎀', polyester: '👕', cotton: '🌿',
  linen: '🌾', nylon: '🧦', alcantara: '🚗', denim: '👖',
}

const HIGH_RISK_FIBERS = ['silk', 'wool', 'cashmere']

// ─── Shared Components ───────────────────────────────────────────────────────

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 16 16" fill="none"
      className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      style={{ color: 'var(--text-secondary)' }}
    >
      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm font-medium transition-colors"
      style={{ color: 'var(--accent)' }}
    >
      {children}
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M3.5 2.5H9.5V8.5M9.5 2.5L2.5 9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  )
}

function Chip({ children, variant = 'default' }: {
  children: React.ReactNode
  variant?: 'default' | 'green' | 'red' | 'gold'
}) {
  const colors = {
    default: 'border-white/10 text-[var(--text-secondary)]',
    green: 'border-green-500/30 bg-green-500/10 text-green-400',
    red: 'border-red-500/30 bg-red-500/10 text-red-400',
    gold: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border ${colors[variant]}`}>
      {children}
    </span>
  )
}

// ─── Tab: By Agent ───────────────────────────────────────────────────────────

function AgentTab() {
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null)
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({})

  return (
    <div className="space-y-3">
      {AGENT_KEYS.map(key => {
        const agent = crosswalk[key] as CrosswalkAgent | undefined
        if (!agent?.genericName) return null
        const isExpanded = expandedAgent === key
        const brandProducts = agent.products?.filter(p => p.productName !== 'N/A' && !p.productName.startsWith('N/A')) || []
        const showAllBrands = expandedBrands[key] || false
        const visibleBrands = showAllBrands ? brandProducts : brandProducts.slice(0, 4)

        return (
          <div key={key} className="card">
            <button
              onClick={() => setExpandedAgent(isExpanded ? null : key)}
              className="w-full text-left flex items-center gap-3"
            >
              <span className="text-lg flex-shrink-0">{AGENT_ICONS[key] || '🧪'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm">{key}</h3>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {agent.genericName}
                  </span>
                </div>
              </div>
              <Chevron open={isExpanded} />
            </button>

            {isExpanded && (
              <div className="mt-3 pt-3 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {agent.description}
                </p>

                {agent.mechanism && (
                  <div className="rounded-lg p-3" style={{ background: 'var(--surface-2)' }}>
                    <p className="text-xs font-mono font-bold mb-1" style={{ color: 'var(--accent)' }}>
                      MECHANISM
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {agent.mechanism}
                    </p>
                  </div>
                )}

                {agent.safetyWarning && (
                  <div className="rounded-lg p-3 border border-red-500/20" style={{ background: 'rgba(239,68,68,0.05)' }}>
                    <p className="text-xs font-mono font-bold mb-1 text-red-400">
                      ⚠️ SAFETY
                    </p>
                    <p className="text-xs text-red-400/80">
                      {agent.safetyWarning}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Brand Products — always visible below card header */}
            {brandProducts.length > 0 && (
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <p className="text-[10px] font-mono font-bold tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                  BRAND PRODUCTS
                </p>
                <div className="space-y-1.5">
                  {visibleBrands.map((p, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className="font-medium flex-shrink-0" style={{ color: 'var(--accent)' }}>
                        {p.company}
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>→</span>
                      <span className="font-bold">{p.productName}</span>
                    </div>
                  ))}
                </div>
                {brandProducts.length > 4 && (
                  <button
                    onClick={() => setExpandedBrands(prev => ({ ...prev, [key]: !prev[key] }))}
                    className="text-[10px] font-mono font-bold mt-2 transition-colors"
                    style={{ color: 'var(--accent)' }}
                  >
                    {showAllBrands ? '▲ Show less' : `▼ Show all ${brandProducts.length}`}
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Tab: By Company ─────────────────────────────────────────────────────────

function CompanyTab() {
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null)

  return (
    <div className="space-y-3">
      {companies.map(company => {
        const isExpanded = expandedCompany === company.id
        const firstSentence = company.overview.summary.split('. ')[0] + '.'

        return (
          <div key={company.id} className="card">
            {/* Header */}
            <button
              onClick={() => setExpandedCompany(isExpanded ? null : company.id)}
              className="w-full text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm">{company.name}</h3>
                    <ExternalLink href={company.website}>{new URL(company.website).hostname.replace('www.', '')}</ExternalLink>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {company.headquarters} · Est. {company.founded}
                  </p>
                </div>
                <Chevron open={isExpanded} />
              </div>

              <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                {firstSentence}
              </p>

              {/* Specialty chips */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {company.specialties.slice(0, 4).map((s, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-md border"
                    style={{
                      borderColor: 'var(--border-strong)',
                      color: 'var(--text-secondary)',
                      background: 'var(--surface-2)',
                    }}
                  >
                    {s.length > 40 ? s.slice(0, 37) + '...' : s}
                  </span>
                ))}
                {company.specialties.length > 4 && (
                  <span className="text-[10px] font-mono px-2 py-0.5" style={{ color: 'var(--text-secondary)' }}>
                    +{company.specialties.length - 4}
                  </span>
                )}
              </div>
            </button>

            {/* Expanded Details */}
            {isExpanded && (
              <CompanyDetails company={company} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function CompanyDetails({ company }: { company: CompanyData }) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const sections = [
    { key: 'overview', label: 'Overview', icon: '📋' },
    { key: 'products', label: 'Product Lines', icon: '🧪' },
    { key: 'agents', label: 'Agent Mapping', icon: '🗺️' },
    { key: 'fibers', label: 'Fiber Expertise', icon: '🧵' },
    { key: 'distribution', label: 'Distribution', icon: '📦' },
    { key: 'gonr', label: 'GONR Relevance', icon: '🟢' },
  ]

  return (
    <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
      {sections.map(section => {
        const isOpen = expandedSection === section.key

        return (
          <div key={section.key}>
            <button
              onClick={() => setExpandedSection(isOpen ? null : section.key)}
              className="w-full flex items-center gap-2 py-2 text-left"
            >
              <span className="text-sm">{section.icon}</span>
              <span className="text-xs font-bold flex-1">{section.label}</span>
              <Chevron open={isOpen} />
            </button>

            {isOpen && (
              <div className="pb-3 pl-6">
                {section.key === 'overview' && (
                  <div className="space-y-2">
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {company.overview.summary}
                    </p>
                    {company.overview.historyAndReputation && (
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {company.overview.historyAndReputation}
                      </p>
                    )}
                  </div>
                )}

                {section.key === 'products' && (
                  <div className="space-y-3">
                    {company.productLines.map((line, i) => (
                      <div key={i}>
                        <p className="text-[10px] font-mono font-bold tracking-wider mb-1" style={{ color: 'var(--accent)' }}>
                          {line.category.toUpperCase()}
                        </p>
                        {line.products.map((product, j) => (
                          <div key={j} className="ml-2 mb-2">
                            <p className="text-xs font-bold">{product.name}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                              {product.description.length > 200
                                ? product.description.slice(0, 197) + '...'
                                : product.description}
                            </p>
                            {product.usedFor && product.usedFor.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {product.usedFor.slice(0, 5).map((use, k) => (
                                  <Chip key={k}>{use}</Chip>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {section.key === 'agents' && (
                  <div className="space-y-2">
                    {Object.entries(company.agentMapping).map(([agent, mapping]) => (
                      <div key={agent} className="flex items-start gap-2 text-xs">
                        <span className="font-mono font-bold flex-shrink-0 w-20" style={{ color: 'var(--accent)' }}>
                          {agent}
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {mapping}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {section.key === 'fibers' && (
                  <div className="space-y-2">
                    {Object.entries(company.fiberExpertise).map(([fiber, note]) => (
                      <div key={fiber} className="flex items-start gap-2 text-xs">
                        <span className="font-mono font-bold flex-shrink-0 w-20 capitalize" style={{ color: 'var(--accent)' }}>
                          {fiber}
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {note}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {section.key === 'distribution' && company.distributionNetwork && (
                  <div className="space-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {company.distributionNetwork.regions && (
                      <p><span className="font-bold" style={{ color: 'var(--text)' }}>Regions:</span> {company.distributionNetwork.regions.join(', ')}</p>
                    )}
                    {company.distributionNetwork.distributionMethod && (
                      <p><span className="font-bold" style={{ color: 'var(--text)' }}>Method:</span> {company.distributionNetwork.distributionMethod}</p>
                    )}
                    {company.distributionNetwork.howToBuy && (
                      <p><span className="font-bold" style={{ color: 'var(--text)' }}>How to buy:</span> {company.distributionNetwork.howToBuy}</p>
                    )}
                  </div>
                )}

                {section.key === 'gonr' && (
                  <div className="space-y-2">
                    <div className="rounded-lg p-3" style={{ background: 'var(--surface-2)' }}>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {company.gonrIntegration.relevance}
                      </p>
                    </div>
                    {company.gonrIntegration.agentCrossReference && (
                      <div className="rounded-lg p-3 border border-green-500/20" style={{ background: 'rgba(34,197,94,0.04)' }}>
                        <p className="text-[10px] font-mono font-bold mb-1" style={{ color: 'var(--accent)' }}>
                          PROTOCOL MAPPING
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {company.gonrIntegration.agentCrossReference}
                        </p>
                      </div>
                    )}
                    {company.gonrIntegration.whenToRecommend && (
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <span className="font-bold" style={{ color: 'var(--text)' }}>When to recommend:</span>{' '}
                        {company.gonrIntegration.whenToRecommend}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Tab: By Fiber ───────────────────────────────────────────────────────────

function FiberTab() {
  const [selectedFiber, setSelectedFiber] = useState<string | null>(null)

  return (
    <div>
      {/* Fiber Grid */}
      {!selectedFiber && (
        <div className="grid grid-cols-4 gap-2">
          {FIBER_KEYS.map(key => {
            const isHighRisk = HIGH_RISK_FIBERS.includes(key)
            return (
              <button
                key={key}
                onClick={() => setSelectedFiber(key)}
                className="card flex flex-col items-center gap-1 py-3 px-2 transition-colors hover:border-green-500/30"
              >
                <span className="text-lg">{FIBER_ICONS[key]}</span>
                <span className="text-xs font-bold capitalize">{key}</span>
                {isHighRisk && (
                  <span className="text-[10px]">⚠️</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Fiber Detail */}
      {selectedFiber && (
        <FiberDetail fiber={selectedFiber} onBack={() => setSelectedFiber(null)} />
      )}
    </div>
  )
}

function FiberDetail({ fiber, onBack }: { fiber: string; onBack: () => void }) {
  const data = fibers[fiber] as FiberEntry | undefined
  if (!data) return null
  const isHighRisk = HIGH_RISK_FIBERS.includes(fiber)

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-mono font-bold px-3 py-1.5 rounded-lg
          border border-white/10 hover:border-green-500/30 transition-colors"
        style={{ color: 'var(--text-secondary)' }}
      >
        ← ALL FIBERS
      </button>

      <div className="flex items-center gap-3">
        <span className="text-2xl">{FIBER_ICONS[fiber]}</span>
        <div>
          <h2 className="text-lg font-bold capitalize">{fiber}</h2>
          {isHighRisk && (
            <Chip variant="red">⚠️ HIGH RISK FIBER</Chip>
          )}
        </div>
      </div>

      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        {data.description}
      </p>

      {/* Key Considerations */}
      <div className="card" style={{ borderColor: isHighRisk ? 'rgba(239,68,68,0.2)' : undefined }}>
        <p className="text-[10px] font-mono font-bold tracking-wider mb-2" style={{ color: isHighRisk ? 'var(--danger)' : 'var(--gold)' }}>
          ⚠️ KEY CONSIDERATIONS
        </p>
        <ul className="space-y-1.5">
          {data.keyConsiderations.map((item, i) => (
            <li key={i} className="text-xs flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
              <span className="flex-shrink-0 mt-0.5" style={{ color: 'var(--gold)' }}>•</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Recommended Companies */}
      <div>
        <p className="text-[10px] font-mono font-bold tracking-wider mb-2" style={{ color: 'var(--accent)' }}>
          RECOMMENDED COMPANIES & PRODUCTS
        </p>
        <div className="space-y-2">
          {data.recommendedCompanies.map((rec, i) => (
            <div key={i} className="card">
              <p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{rec.company}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{rec.why}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {rec.products.map((prod, j) => (
                  <Chip key={j} variant="green">{prod}</Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agents To Use / Avoid */}
      <div className="grid grid-cols-1 gap-3">
        <div className="card">
          <p className="text-[10px] font-mono font-bold tracking-wider mb-2" style={{ color: 'var(--accent)' }}>
            ✓ AGENTS TO USE
          </p>
          <div className="flex flex-wrap gap-1.5">
            {data.agentsToUse.map((agent, i) => (
              <Chip key={i} variant="green">{agent}</Chip>
            ))}
          </div>
        </div>

        <div className="card" style={{ borderColor: 'rgba(239,68,68,0.15)' }}>
          <p className="text-[10px] font-mono font-bold tracking-wider mb-2 text-red-400">
            ✗ AGENTS TO AVOID
          </p>
          <div className="flex flex-wrap gap-1.5">
            {data.agentsToAvoid.map((agent, i) => (
              <Chip key={i} variant="red">{agent}</Chip>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
  { key: 'agent', label: 'By Agent' },
  { key: 'company', label: 'By Company' },
  { key: 'fiber', label: 'By Fiber' },
]

export default function ChemicalReferencePage() {
  const [activeTab, setActiveTab] = useState<Tab>('agent')

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">Chemical Reference</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Professional cleaning agents, company directory, and fiber guides.
        </p>
      </div>

      {/* Tab Bar */}
      <div
        className="flex rounded-xl p-1 gap-1"
        style={{ background: 'var(--surface-2)' }}
      >
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${
              activeTab === tab.key
                ? 'text-white shadow-sm'
                : ''
            }`}
            style={{
              background: activeTab === tab.key ? 'var(--accent)' : 'transparent',
              color: activeTab === tab.key ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'agent' && <AgentTab />}
      {activeTab === 'company' && <CompanyTab />}
      {activeTab === 'fiber' && <FiberTab />}
    </div>
  )
}
