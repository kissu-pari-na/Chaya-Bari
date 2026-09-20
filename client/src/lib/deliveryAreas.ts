// Serviceable delivery areas (client mirror of the server's
// server/src/modules/orders/delivery-areas.ts — keep the two in sync). Chaya
// Bari only delivers to these areas; orders elsewhere are refused at checkout.

export const DELIVERY_ZONES: Record<string, string[]> = {
  'Mirpur 12 & DOHS Zone': ['Mirpur 12', 'Mirpur DOHS', 'Shopnonagar', 'Shagufta'],
  'ECB Chattar & Matikata Zone': ['ECB Chattar', 'Matikata'],
  'Manikdi & Balughat Zone': [
    'Manikdi',
    'Namapara',
    'Balughat',
    'Barontak',
    'Goaltak',
    'Aziz Market',
    'Hazi Market',
    'Bepari Market',
    'Kalibari',
  ],
  'Baunia Zone': ['Baunia'],
}

/// Orbitax staff can also order to their Mohakhali office (the default address
/// pre-filled for orbitax.com accounts).
export const ORBITAX_OFFICE_AREA = 'Mohakhali Dohs'

function normalize(area: string | null | undefined): string {
  return (area ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

const SERVICEABLE = new Set(Object.values(DELIVERY_ZONES).flat().map(normalize))

export const SERVICEABLE_AREAS: string[] = Object.values(DELIVERY_ZONES).flat()

export function isServiceableArea(area: string | null | undefined): boolean {
  return SERVICEABLE.has(normalize(area))
}

/// Whether the given area is orderable: serviceable for everyone, plus the
/// Mohakhali office for orbitax accounts.
export function isOrderableArea(area: string | null | undefined, isOrbitax: boolean): boolean {
  if (isServiceableArea(area)) return true
  if (isOrbitax && normalize(area) === normalize(ORBITAX_OFFICE_AREA)) return true
  return false
}
