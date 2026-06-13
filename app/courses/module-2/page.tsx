import { hasFounderAccess } from '@/lib/auth/founder-access'
import { MODULE_2_META, MODULE_2_LESSONS, MODULE_2_QUIZ } from '@/lib/courses/module2'
import ModuleTwoClient from './ModuleTwoClient'

// TASK-250 — server component. The course corpus is imported only here and
// passed to a founder-gated client island, keeping training copy out of
// unauthenticated static chunks.
export default async function Module2Page() {
  if (!(await hasFounderAccess())) {
    return <div className="p-6 text-sm text-red-700">Founder access required.</div>
  }

  return (
    <ModuleTwoClient
      meta={MODULE_2_META}
      lessons={MODULE_2_LESSONS}
      quiz={MODULE_2_QUIZ}
    />
  )
}
