import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { adminApi, DbOverview, DbTableInfo, DbRowsResponse } from '../../api/adminApi';
import { Database, Server, Clock, Users as UsersIcon, Trash2, Eye, RefreshCcw, ChevronLeft, ChevronRight, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  const s = String(value);
  return s.length > 120 ? s.slice(0, 117) + '…' : s;
}

function TableBrowser({ table, onClose }: { table: string; onClose: () => void }) {
  const [data, setData] = useState<DbRowsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 25;

  const load = () => {
    setLoading(true);
    adminApi.dbRows(table, page, limit)
      .then((r) => setData(r.data))
      .catch(() => toast.error('Nepodařilo se načíst data.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [table, page]);

  const handleDelete = async (id: unknown) => {
    if (!confirm(`Opravdu smazat řádek #${id} z tabulky "${table}"?`)) return;
    try {
      await adminApi.dbDeleteRow(table, String(id));
      toast.success('Řádek smazán.');
      load();
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error ?? 'Chyba při mazání.');
    }
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Database size={20} className="text-blue-600" />
            <h3 className="font-bold text-gray-800">
              {table} <span className="text-gray-400 font-normal">({data?.total.toLocaleString('cs-CZ') ?? '…'} řádků)</span>
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <LoadingSpinner />
          ) : !data || data.rows.length === 0 ? (
            <div className="text-center py-12 text-gray-400">Žádné záznamy.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {data.columns.map((col) => (
                    <th key={col} className="text-left px-3 py-2 font-semibold text-gray-700 border-b border-gray-200">
                      {col}
                    </th>
                  ))}
                  <th className="px-3 py-2 border-b border-gray-200 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    {data.columns.map((col) => (
                      <td key={col} className="px-3 py-2 text-gray-700 font-mono text-xs max-w-[240px] truncate" title={formatCell(row[col])}>
                        {formatCell(row[col])}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      <button
                        onClick={() => handleDelete(row.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Smazat"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {data && data.total > limit && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              Strana {page} z {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDatabasePage() {
  const [overview, setOverview] = useState<DbOverview | null>(null);
  const [tables, setTables] = useState<DbTableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTable, setActiveTable] = useState<string | null>(null);

  const loadAll = () => {
    setLoading(true);
    Promise.all([adminApi.dbOverview(), adminApi.dbTables()])
      .then(([o, t]) => {
        setOverview(o.data);
        setTables(t.data.tables);
      })
      .catch(() => toast.error('Nepodařilo se načíst stav databáze.'))
      .finally(() => setLoading(false));
  };

  useEffect(loadAll, []);

  const handleClearCache = async (table: 'transport_connections' | 'accommodations') => {
    if (!confirm(`Opravdu vymazat cache tabulku "${table}"? Tato akce je nevratná.`)) return;
    try {
      await adminApi.dbClearCache(table);
      toast.success(`Cache tabulka "${table}" vymazána.`);
      loadAll();
    } catch {
      toast.error('Chyba při mazání cache.');
    }
  };

  if (loading) return <AdminLayout><LoadingSpinner /></AdminLayout>;

  const pgVersionShort = overview?.version.split(' ').slice(0, 2).join(' ') ?? '';

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Databáze</h1>
        <button
          onClick={loadAll}
          className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
        >
          <RefreshCcw size={14} /> Obnovit
        </button>
      </div>

      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
              <Database size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-800">{overview.size_pretty}</div>
            <div className="text-sm text-gray-500">Velikost DB</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center mb-2">
              <UsersIcon size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-800">{overview.connections}</div>
            <div className="text-sm text-gray-500">Aktivní připojení</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-2">
              <Clock size={20} />
            </div>
            <div className="text-lg font-bold text-gray-800">{overview.uptime}</div>
            <div className="text-sm text-gray-500">Doba běhu</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center mb-2">
              <Server size={20} />
            </div>
            <div className="text-sm font-bold text-gray-800 truncate" title={overview.version}>{pgVersionShort}</div>
            <div className="text-sm text-gray-500">Verze</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-bold text-gray-800">Tabulky ({tables.length})</h2>
          <span className="text-xs text-gray-400">Seřazeno podle velikosti</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-gray-600">Název</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-600">Řádky</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-600">Velikost</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-600">Poslední autovacuum</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-600">Akce</th>
              </tr>
            </thead>
            <tbody>
              {tables.map((t) => (
                <tr key={t.table_name} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-mono text-gray-800">{t.table_name}</td>
                  <td className="px-4 py-2.5 text-right text-gray-700">{t.row_count.toLocaleString('cs-CZ')}</td>
                  <td className="px-4 py-2.5 text-right text-gray-700">{t.size_pretty}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">
                    {t.last_autovacuum ? new Date(t.last_autovacuum).toLocaleString('cs-CZ') : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {t.browsable && (
                        <button
                          onClick={() => setActiveTable(t.table_name)}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-2 py-1 hover:bg-blue-50"
                        >
                          <Eye size={12} /> Procházet
                        </button>
                      )}
                      {t.clearable && (
                        <button
                          onClick={() => handleClearCache(t.table_name as 'transport_connections' | 'accommodations')}
                          className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 border border-red-200 rounded px-2 py-1 hover:bg-red-50"
                        >
                          <Trash2 size={12} /> Vymazat cache
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
        <div>
          <strong>Upozornění:</strong> Mazání záznamů a vyprázdnění cache je nevratné. Cache tabulky (transport_connections, accommodations) se znovu naplní při dalším vyhledávání uživatelů (TTL 15 min / 24 h).
        </div>
      </div>

      {activeTable && <TableBrowser table={activeTable} onClose={() => setActiveTable(null)} />}
    </AdminLayout>
  );
}
