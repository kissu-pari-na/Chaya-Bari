// Serviceable delivery areas. Chaya Bari only delivers to these areas (grouped
// into zones for display). Orders to any other area are refused at checkout.
//
// This is the single source of truth on the server; the client mirrors it in
// client/src/lib/deliveryAreas.ts — keep the two in sync.

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

/// Orbitax staff can additionally order to their Mohakhali office (the default
/// address we pre-fill for orbitax.com accounts), which is outside the general
/// serviceable areas. Matched by this area label.
export const ORBITAX_OFFICE_AREA = 'Mohakhali Dohs'

function normalize(area: string | null | undefined): string {
  return (area ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

const SERVICEABLE = new Set(
  Object.values(DELIVERY_ZONES).flat().map(normalize),
)

/// All serviceable area names, flattened (for building selectors/messages).
export const SERVICEABLE_AREAS: string[] = Object.values(DELIVERY_ZONES).flat()

/// Whether an area is within the general delivery coverage.
export function isServiceableArea(area: string | null | undefined): boolean {
  return SERVICEABLE.has(normalize(area))
}

/// Whether the given area is orderable for this user. Non-orbitax users are
/// limited to the serviceable areas; orbitax.com accounts may also order to the
/// Mohakhali office.
export function isOrderableArea(area: string | null | undefined, isOrbitax: boolean): boolean {
  if (isServiceableArea(area)) return true
  if (isOrbitax && normalize(area) === normalize(ORBITAX_OFFICE_AREA)) return true
  return false
}
