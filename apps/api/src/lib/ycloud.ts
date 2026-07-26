// Envío por la API oficial de YCloud/Meta — mismo endpoint y formato que ya
// usa en producción ConsentsPro (ver apps/api/server/src/lib/whatsappSend.ts
// en la raíz del repo), simplificado aquí porque Lime no necesita ventana de
// 24h ni plantillas todavía (v1: solo texto libre).
export const YCLOUD_BASE = 'https://api.ycloud.com/v2'

export async function sendViaYCloud(apiKey: string, waNumber: string, phone: string, body: string): Promise<string | null> {
  const resp = await fetch(`${YCLOUD_BASE}/whatsapp/messages`, {
    method: 'POST',
    headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: waNumber, to: phone, type: 'text', text: { body } }),
  })
  const json: any = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    const reason = json?.message ?? json?.error?.message ?? `HTTP ${resp.status}`
    throw new Error(reason)
  }
  return json?.id ?? null
}
