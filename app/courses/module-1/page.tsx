import { hasFounderAccess } from '@/lib/auth/founder-access'
import { MODULE_1_META, MODULE_1_LESSONS, MODULE_1_QUIZ } from '@/lib/courses/module1'
import ModuleOneClient from './ModuleOneClient'

// TASK-250 — server component. The course corpus is imported only here and
// passed to a founder-gated client island, keeping training copy out of
// unauthenticated static chunks.
export default async function Module1Page() {
  if (!(await hasFounderAccess())) {
    return <div className="p-6 text-sm text-red-700">Founder access required.</div>
  }

  return (
    <ModuleOneClient
      meta={MODULE_1_META}
      lessons={MODULE_1_LESSONS}
      quiz={MODULE_1_QUIZ}
    />
  )
}
