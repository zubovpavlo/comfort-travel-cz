import { useState, useEffect } from 'react';
import { adminApi } from '../../api/adminApi';
import AdminLayout from '../../components/admin/AdminLayout';
import DataTable from '../../components/admin/DataTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = () => {
    adminApi.getUsers().then((res) => {
      setUsers(res.data.users);
      setTotal(res.data.total);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await adminApi.updateUserRole(userId, newRole);
      toast.success('Role změněna.');
      load();
    } catch {
      toast.error('Chyba při změně role.');
    }
  };

  const handleDelete = async (user: any) => {
    if (!confirm(`Opravdu smazat ${user.email}?`)) return;
    try {
      await adminApi.deleteUser(user.id);
      toast.success('Uživatel smazán.');
      load();
    } catch {
      toast.error('Chyba při mazání.');
    }
  };

  if (loading) return <AdminLayout><LoadingSpinner /></AdminLayout>;

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Uživatelé ({total})</h1>

      <div className="bg-white rounded-xl shadow">
        <DataTable
          columns={[
            { key: 'id', label: 'ID' },
            { key: 'email', label: 'E-mail' },
            { key: 'first_name', label: 'Jméno', render: (v, row) => `${v || ''} ${row.last_name || ''}`.trim() || '—' },
            {
              key: 'role', label: 'Role', render: (v, row) => (
                <select
                  value={v}
                  onChange={(e) => handleRoleChange(row.id, e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              ),
            },
            { key: 'created_at', label: 'Registrace', render: (v) => new Date(v).toLocaleDateString('cs-CZ') },
          ]}
          data={users}
          onDelete={handleDelete}
        />
      </div>
    </AdminLayout>
  );
}
