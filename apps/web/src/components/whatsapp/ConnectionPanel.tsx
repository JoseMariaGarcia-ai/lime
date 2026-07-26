import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Card'

interface ConnectionInfo {
  provider: 'ycloud' | 'baileys'
  ycloud: { configured: boolean }
  baileys: { status: string; qr_code: string | null; last_error: string | null }
}

export function ConnectionPanel({ clientId }: { clientId: string }) {
  const [info, setInfo] = useState<ConnectionInfo | null>(null)

  async function load() {
    const data = await api.get(`/api/whatsapp/connections/${clientId}`)
    setInfo(data)
  }

  useEffect(() => {
    load()
    // Cuando Baileys está "conectando" (esperando escaneo del QR o
    // negociando), se refresca cada 3s para recoger el QR o el cambio a
    // "conectado" sin que el usuario tenga que recargar la página.
    const interval = setInterval(() => {
      if (info?.baileys.status === 'conectando') load()
    }, 3000)
    return () => clearInterval(interval)
  }, [clientId, info?.baileys.status])

  if (!info) return null

  if (info.provider === 'ycloud') {
    return (
      <div className="flex items-center gap-2 border-b border-navy-700 px-4 py-2 text-sm">
        <span className="text-navy-400">YCloud:</span>
        <Badge color={info.ycloud.configured ? 'lime' : 'red'}>
          {info.ycloud.configured ? 'Configurado' : 'Falta configurar la clave/número en la ficha del cliente'}
        </Badge>
      </div>
    )
  }

  return (
    <div className="border-b border-navy-700 px-4 py-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-navy-400">Baileys:</span>
        <Badge color={info.baileys.status === 'conectado' ? 'lime' : info.baileys.status === 'error' ? 'red' : 'gray'}>
          {info.baileys.status}
        </Badge>
        {info.baileys.status !== 'conectado' && (
          <Button
            variant="secondary"
            className="ml-auto py-1 text-xs"
            onClick={async () => { await api.post(`/api/whatsapp/connections/${clientId}/baileys/connect`); load() }}
          >
            Conectar
          </Button>
        )}
        {info.baileys.status === 'conectado' && (
          <Button
            variant="ghost"
            className="ml-auto py-1 text-xs"
            onClick={async () => { await api.post(`/api/whatsapp/connections/${clientId}/baileys/disconnect`); load() }}
          >
            Desconectar
          </Button>
        )}
      </div>
      {info.baileys.qr_code && (
        <div className="mt-3 flex flex-col items-center gap-2 rounded-lg bg-white p-3">
          <img src={info.baileys.qr_code} alt="Código QR de WhatsApp" className="h-40 w-40" />
          <p className="text-xs text-navy-700">Escanea con WhatsApp → Dispositivos vinculados</p>
        </div>
      )}
      {info.baileys.last_error && <p className="mt-2 text-xs text-red-400">{info.baileys.last_error}</p>}
    </div>
  )
}
