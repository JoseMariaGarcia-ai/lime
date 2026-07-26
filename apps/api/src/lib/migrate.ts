import fs from 'fs'
import path from 'path'
import { pool } from './db'

// Aplica cada fichero .sql de migrations/ no aplicado todavía, en orden por
// nombre, y lo registra en schema_migrations — mismo patrón que ConsentsPro
// (ver apps/api/server/src/lib/migrate.ts en la raíz del repo).
function migrationsDir(): string {
  return path.resolve(__dirname, '../../migrations')
}

export async function runMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  const dir = migrationsDir()
  if (!fs.existsSync(dir)) {
    console.warn(`[migrate] no se encontró el directorio de migraciones (${dir}) — se omite`)
    return
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()
  const { rows: applied } = await pool.query('SELECT filename FROM schema_migrations')
  const appliedSet = new Set(applied.map((r: any) => r.filename))

  const failed: string[] = []
  for (const file of files) {
    if (appliedSet.has(file)) continue
    try {
      const sql = fs.readFileSync(path.join(dir, file), 'utf8')
      console.log(`[migrate] aplicando ${file}...`)
      await pool.query(sql)
      await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING', [file])
      console.log(`[migrate] aplicada ${file}`)
    } catch (err: any) {
      failed.push(file)
      console.error(`[migrate] FALLO al aplicar ${file} — se continúa con el resto:`, err.message ?? err)
    }
  }
  if (failed.length) {
    console.error(`[migrate] ${failed.length} migración(es) fallaron: ${failed.join(', ')} — corregir y redesplegar`)
  }
}
