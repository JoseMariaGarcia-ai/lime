import crypto from 'crypto'

// Cifrado en reposo de las claves de API (n8n, OpenRouter, Claude, YCloud)
// guardadas por cliente y a nivel de cuenta — son credenciales de terceros
// reales, no deben quedar en texto plano en la base de datos. AES-256-GCM
// con IV aleatorio por valor; el resultado se guarda como
// "<iv>:<authTag>:<ciphertext>" en base64, todo en una sola columna TEXT.
//
// ⚠️ Igual que BACKUP_ENCRYPTION_KEY/CERTIFICATE_*_ENCRYPTION_KEY en
// ConsentsPro: una vez fijada esta clave en producción, no debe rotarse sin
// plan de migración — los valores ya cifrados dejarían de poder descifrarse.
function getKey(): Buffer {
  const raw = process.env.LIME_ENCRYPTION_KEY
  if (!raw || raw.trim().length < 32) {
    throw new Error('Falta configurar LIME_ENCRYPTION_KEY (openssl rand -hex 32) en las variables de entorno del backend')
  }
  // Acepta tanto un hex de 64 caracteres (32 bytes) como cualquier string
  // largo — se deriva siempre a 32 bytes exactos vía sha256 para no
  // depender de que el valor configurado sea hex válido.
  return crypto.createHash('sha256').update(raw).digest()
}

export function encryptSecret(plain: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`
}

export function decryptSecret(encoded: string | null): string | null {
  if (!encoded) return null
  const [ivB64, tagB64, dataB64] = encoded.split(':')
  if (!ivB64 || !tagB64 || !dataB64) return null
  const key = getKey()
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  const plain = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()])
  return plain.toString('utf8')
}

// Cifra solo si hay valor — evita guardar un blob cifrado de cadena vacía
// cuando un campo de API key se deja en blanco a propósito.
export function encryptSecretOrNull(plain: string | null | undefined): string | null {
  if (!plain || !plain.trim()) return null
  return encryptSecret(plain)
}
