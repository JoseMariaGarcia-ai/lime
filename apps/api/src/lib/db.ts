import { Pool, PoolClient } from 'pg'

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
})

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const { rows } = await pool.query(sql, params)
  return rows
}

export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const { rows } = await pool.query(sql, params)
  return rows[0] ?? null
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
