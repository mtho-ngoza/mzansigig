/**
 * South African banks supported by TradeSafe
 *
 * Single source of truth for bank names and TradeSafe UniversalBranchCode values.
 * Used by UI components (dropdown options) and API routes (token creation).
 */

// TradeSafe UniversalBranchCode enum values (UPPERCASE)
export const TRADESAFE_BANK_CODES: Record<string, string> = {
  'ABSA': 'ABSA',
  'FNB': 'FNB',
  'Nedbank': 'NEDBANK',
  'Standard Bank': 'STANDARD_BANK',
  'Capitec': 'CAPITEC',
  'African Bank': 'AFRICAN_BANK',
  'Bidvest Bank': 'BIDVEST',
  'Discovery Bank': 'DISCOVERY',
  'First Rand': 'FIRSTRAND',
  'Grindrod Bank': 'GRINDROD',
  'Investec': 'INVESTEC',
  'Mercantile Bank': 'MERCANTILE',
  'Sasfin': 'SASFIN',
  'TymeBank': 'TYMEBANK',
}

// Bank names for UI dropdowns
export const SUPPORTED_BANKS = Object.keys(TRADESAFE_BANK_CODES)

// Helper to get TradeSafe code from bank name
export function getTradeSafeBankCode(bankName: string): string | undefined {
  return TRADESAFE_BANK_CODES[bankName]
}
