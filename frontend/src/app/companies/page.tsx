import { serverApi } from '@/lib/api-server'
import { CompaniesClient } from './_client'

export const metadata = { title: 'Companies' }
export const dynamic = 'force-dynamic'

export default async function CompaniesPage() {
  const companies = await serverApi.companies.list().catch(() => [])
  return <CompaniesClient initialCompanies={companies} />
}
