/**
 * Normalize a certification entry (string or object) into a consistent object form.
 * Handles backward compatibility with plain string certifications.
 */
export function normalizeCert(cert) {
  if (typeof cert === 'string') {
    return { name: cert, imageId: null }
  }
  return { name: cert.name, imageId: cert.imageId || null }
}

/**
 * Normalize an entire certifications array.
 */
export function normalizeCerts(certs) {
  if (!certs || !Array.isArray(certs)) return []
  return certs.map(normalizeCert)
}

/**
 * Convert normalized cert back to schema format for saving.
 * Uses string form when no image, object form when image attached.
 */
export function certToSchemaFormat(cert) {
  if (cert.imageId) {
    return { name: cert.name, imageId: cert.imageId }
  }
  return cert.name
}
