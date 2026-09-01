/**
 * Search over the contacts directory. Ported from the previous app, where it
 * was one of only two tested modules — the Unicode-aware normalization matters
 * for a directory containing Kazakh and Russian names.
 */
export interface SearchableContact {
  label?: string
  value: string
  extraInfo?: string
}

export interface SearchableService {
  name: string
  description: string
  contacts: SearchableContact[]
}

export interface ContactSearchResult<TService extends SearchableService> {
  service: TService
  contacts: TService["contacts"]
}

function normalizeSearchValue(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
}

export function findMatchingContacts<TService extends SearchableService>(
  services: readonly TService[],
  query: string
): ContactSearchResult<TService>[] {
  const normalizedQuery = normalizeSearchValue(query)

  if (!normalizedQuery) {
    return services.map((service) => ({
      service,
      contacts: service.contacts,
    }))
  }

  const terms = normalizedQuery.split(" ")

  return services.flatMap((service) => {
    const serviceText = `${service.name} ${service.description}`
    const contacts = service.contacts.filter((contact) => {
      const searchableText = normalizeSearchValue(
        [
          serviceText,
          contact.label ?? "",
          contact.value,
          contact.extraInfo ?? "",
        ].join(" ")
      )

      return terms.every((term) => searchableText.includes(term))
    })

    return contacts.length > 0 ? [{ service, contacts }] : []
  })
}
