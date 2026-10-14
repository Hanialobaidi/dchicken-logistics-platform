import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { companySettingsTable, cleanData } from '@/lib/db'
import type { CompanySettings } from '@/types'

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  id: '',
  name: 'شركة آفاق الرغد للدواجن',
  taxNumber: '311648304500003',
  cr: '7054494799',
  address: 'حي النزهة، جدة',
  phones: '0533632350 / 0575759184',
  createdAt: '',
  updatedAt: '',
}

/** Fetch the company settings (single row, falls back to defaults) */
export function useCompanySettings() {
  return useQuery({
    queryKey: ['companySettings'],
    queryFn: async (): Promise<CompanySettings> => {
      const rows = await companySettingsTable.list<CompanySettings>({
        orderBy: { createdAt: 'asc' },
        limit: 1,
      })
      return rows[0] ?? DEFAULT_COMPANY_SETTINGS
    },
    staleTime: 5 * 60_000,
  })
}

/** Update the company settings (creates the row if none exists) */
export function useUpdateCompanySettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      id?: string
      name: string
      taxNumber: string
      cr: string
      address: string
      phones: string
    }) => {
      const payload = cleanData({
        name: data.name,
        taxNumber: data.taxNumber,
        cr: data.cr,
        address: data.address,
        phones: data.phones,
        updatedAt: new Date().toISOString(),
      })
      if (data.id) {
        return companySettingsTable.update<CompanySettings>(data.id, payload)
      }
      return companySettingsTable.create<CompanySettings>(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companySettings'] })
    },
  })
}
