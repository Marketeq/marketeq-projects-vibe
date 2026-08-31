import { create } from "zustand"

/**
 * The Export dropdowns live in the page header (settings billing tabs), but the
 * rows they export live inside the tab content along with the active filters.
 * Each content component registers its exporters here on mount so the header can
 * call them. A store rather than a ref because the content is loaded through
 * `dynamic(..., { ssr: false })`.
 */
export type BillingExporters = {
  exportCsv: () => void
  exportPdf: () => Promise<void>
}

export type BillingExportScope = "invoices" | "transactions"

export const useBillingExportStore = create<{
  exporters: Partial<Record<BillingExportScope, BillingExporters | null>>
  register: (
    scope: BillingExportScope,
    exporters: BillingExporters | null
  ) => void
}>((set) => ({
  exporters: {},
  register: (scope, exporters) =>
    set((state) => ({ exporters: { ...state.exporters, [scope]: exporters } })),
}))
