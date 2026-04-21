import { Request, Response, NextFunction } from 'express';
import db from '../config/database';

// Whitelist of tables exposed to the admin DB browser.
// Adding a table here enables read + delete-by-PK. Keep cache tables separate for TRUNCATE.
const BROWSABLE_TABLES = [
  'users',
  'orders',
  'favorites',
  'saved_searches',
  'accommodations',
  'transport_connections',
] as const;

const CACHE_TABLES = ['transport_connections', 'accommodations'] as const;

type Browsable = typeof BROWSABLE_TABLES[number];

function isBrowsable(name: string): name is Browsable {
  return (BROWSABLE_TABLES as readonly string[]).includes(name);
}

export const adminDbController = {
  async overview(_req: Request, res: Response, next: NextFunction) {
    try {
      const [sizeRow] = await db.raw<{ rows: { pretty: string; bytes: string }[] }>(`
        SELECT pg_size_pretty(pg_database_size(current_database())) AS pretty,
               pg_database_size(current_database())::text AS bytes
      `).then((r: any) => [r.rows[0]]);

      const [{ version }] = (await db.raw(`SELECT version()`)).rows;
      const [{ count: connections }] = (await db.raw(
        `SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname = current_database()`,
      )).rows;
      const [{ now }] = (await db.raw(`SELECT now()`)).rows;
      const [{ uptime }] = (await db.raw(
        `SELECT date_trunc('second', now() - pg_postmaster_start_time())::text AS uptime`,
      )).rows;

      res.json({
        size_pretty: sizeRow.pretty,
        size_bytes: Number(sizeRow.bytes),
        version,
        connections,
        server_time: now,
        uptime,
      });
    } catch (err) {
      next(err);
    }
  },

  async tables(_req: Request, res: Response, next: NextFunction) {
    try {
      const { rows } = await db.raw<{ rows: Array<{
        table_name: string;
        row_count: string;
        total_bytes: string;
        size_pretty: string;
        last_vacuum: string | null;
        last_autovacuum: string | null;
        last_analyze: string | null;
      }> }>(`
        SELECT
          c.relname AS table_name,
          c.reltuples::bigint::text AS row_count,
          pg_total_relation_size(c.oid)::text AS total_bytes,
          pg_size_pretty(pg_total_relation_size(c.oid)) AS size_pretty,
          s.last_vacuum::text AS last_vacuum,
          s.last_autovacuum::text AS last_autovacuum,
          s.last_analyze::text AS last_analyze
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
        WHERE n.nspname = 'public' AND c.relkind = 'r'
        ORDER BY pg_total_relation_size(c.oid) DESC
      `);

      const tables = rows.map((r) => ({
        table_name: r.table_name,
        row_count: Number(r.row_count),
        size_bytes: Number(r.total_bytes),
        size_pretty: r.size_pretty,
        last_vacuum: r.last_vacuum,
        last_autovacuum: r.last_autovacuum,
        last_analyze: r.last_analyze,
        browsable: isBrowsable(r.table_name),
        clearable: (CACHE_TABLES as readonly string[]).includes(r.table_name),
      }));

      res.json({ tables });
    } catch (err) {
      next(err);
    }
  },

  async rows(req: Request, res: Response, next: NextFunction) {
    try {
      const table = String(req.params.table);
      if (!isBrowsable(table)) {
        res.status(403).json({ error: 'Tato tabulka není přístupná přes admin rozhraní.' });
        return;
      }

      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
      const offset = (page - 1) * limit;

      const [{ count }] = await db(table).count('* as count');
      const total = Number(count);

      // Select all rows but redact sensitive columns
      let rows = await db(table)
        .select('*')
        .orderBy('id', 'desc')
        .limit(limit)
        .offset(offset);

      if (table === 'users') {
        rows = rows.map(({ password_hash: _unused, ...r }: any) => r);
      }

      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

      res.json({ rows, columns, total, page, limit });
    } catch (err) {
      next(err);
    }
  },

  async deleteRow(req: Request, res: Response, next: NextFunction) {
    try {
      const table = String(req.params.table);
      if (!isBrowsable(table)) {
        res.status(403).json({ error: 'Tato tabulka není přístupná přes admin rozhraní.' });
        return;
      }
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        res.status(400).json({ error: 'Neplatné ID' });
        return;
      }

      const deleted = await db(table).where({ id }).del();
      if (!deleted) {
        res.status(404).json({ error: 'Řádek nebyl nalezen.' });
        return;
      }
      res.json({ success: true, deleted });
    } catch (err) {
      next(err);
    }
  },

  async clearCache(req: Request, res: Response, next: NextFunction) {
    try {
      const target = String(req.body?.table || '');
      if (!(CACHE_TABLES as readonly string[]).includes(target)) {
        res.status(400).json({ error: 'Lze vymazat pouze cache tabulky.' });
        return;
      }
      await db.raw(`TRUNCATE TABLE ?? RESTART IDENTITY CASCADE`, [target]);
      res.json({ success: true, cleared: target });
    } catch (err) {
      next(err);
    }
  },
};
