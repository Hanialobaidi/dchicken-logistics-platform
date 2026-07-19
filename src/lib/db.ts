import { supabase } from '@/lib/supabase'

/** Convert snake_case → camelCase */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

/** Convert camelCase → snake_case */
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
}

/** Convert all keys of a row from snake_case (Supabase) → camelCase (TypeScript) */
function rowToCamel<T = Record<string, unknown>>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    result[toCamelCase(key)] = value
  }
  return result as T
}

/** Convert all keys of a payload from camelCase (TypeScript) → snake_case (Supabase) */
function payloadToSnake(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    result[toSnakeCase(key)] = value
  }
  return result
}

/**
 * Supabase table wrapper that mimics the Blink SDK API.
 * This way all existing hooks work without changes.
 */
class SupabaseTable {
  constructor(private tableName: string) {}

  async list<T = Record<string, unknown>>(opts?: {
    orderBy?: Record<string, 'asc' | 'desc'>
    where?: Record<string, unknown> | { AND?: Record<string, unknown>[] }
    limit?: number
  }): Promise<T[]> {
    let query = supabase.from(this.tableName).select('*')

    if (opts?.where) {
      if (opts.where.AND && Array.isArray(opts.where.AND)) {
        for (const condition of opts.where.AND) {
          for (const [key, value] of Object.entries(condition)) {
            query = query.eq(key, value)
          }
        }
      } else {
        for (const [key, value] of Object.entries(opts.where)) {
          if (key !== 'AND') {
            query = query.eq(toSnakeCase(key), value)
          }
        }
      }
    }

    if (opts?.orderBy) {
      for (const [key, direction] of Object.entries(opts.orderBy)) {
        query = query.order(toSnakeCase(key), { ascending: direction === 'asc' })
      }
    }

    if (opts?.limit) {
      query = query.limit(opts.limit)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []).map((row) => rowToCamel<T>(row as Record<string, unknown>))
  }

  async get<T = Record<string, unknown>>(id: string): Promise<T | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw new Error(error.message)
    return data ? rowToCamel<T>(data as Record<string, unknown>) : null
  }

  async create<T = Record<string, unknown>>(data: Record<string, unknown>): Promise<T> {
    const snakeData = payloadToSnake(data)
    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert(snakeData)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return rowToCamel<T>(result as Record<string, unknown>)
  }

  async createMany<T = Record<string, unknown>>(items: Record<string, unknown>[]): Promise<T[]> {
    if (items.length === 0) return []
    const snakeItems = items.map((item) => payloadToSnake(item))
    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert(snakeItems)
      .select()
    if (error) throw new Error(error.message)
    return (result ?? []).map((row) => rowToCamel<T>(row as Record<string, unknown>))
  }

  async update<T = Record<string, unknown>>(id: string, data: Record<string, unknown>): Promise<T> {
    const snakeData = payloadToSnake(data)
    const { data: result, error } = await supabase
      .from(this.tableName)
      .update(snakeData)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return rowToCamel<T>(result as Record<string, unknown>)
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
  }
}

// ── Table instances ──
export const purchasesTable = new SupabaseTable('purchases')
export const driversTable = new SupabaseTable('drivers')
export const restaurantsTable = new SupabaseTable('restaurants')
export const directOrdersTable = new SupabaseTable('direct_orders')
export const invoicesTable = new SupabaseTable('invoices')
export const tripsTable = new SupabaseTable('trips')
export const tripRestaurantsTable = new SupabaseTable('trip_restaurants')

export function cleanData(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      result[key] = value
    }
  }
  return result
}
