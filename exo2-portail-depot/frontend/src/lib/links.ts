/**
 * Construction des liens publics de depot.
 * La base est configurable : en production le lien envoye au client doit porter
 * le domaine public, pas l'origine du navigateur de l'avocat.
 */
const PUBLIC_BASE = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin

export function publicLinkFor(token: string): string {
  return `${PUBLIC_BASE.replace(/\/$/, '')}/d/${token}`
}

/** Version courte affichee dans l'UI, sans le protocole. */
export function publicLinkDisplay(token: string): string {
  return publicLinkFor(token).replace(/^https?:\/\//, '')
}
