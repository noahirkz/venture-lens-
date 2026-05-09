import { api } from '@/lib/api'
import { CompaniesClient } from './_client'

export const metadata = { title: 'Companies' }

export default async function CompaniesPage() {
  const companies = await api.companies.list().catch(() => [])
  return <CompaniesClient initialCompanies={companies} />
}
