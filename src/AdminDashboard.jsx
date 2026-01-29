import { useState, useEffect } from 'react';
import { UserPlus, Trash2, Users, Shield, LogOut } from 'lucide-react';

function AdminDashboard({ onLogout }) {
  const [users, setUsers] = useState(() => {
    const savedUsers = localStorage.getItem('appUsers');
    return savedUsers ? JSON.parse(savedUsers) : [{ username: 'admin', password: 'admin123', role: 'admin' }];
  });

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    localStorage.setItem('appUsers', JSON.stringify(users));
  }, [users]);

  const addUser = (e) => {
    e.preventDefault();
    if (users.find(u => u.username === newUsername)) {
      setError('اسم المستخدم موجود بالفعل');
      return;
    }
    setUsers([...users, { username: newUsername, password: newPassword, role: 'user' }]);
    setNewUsername('');
    setNewPassword('');
    setError('');
  };

  const deleteUser = (username) => {
    if (username === 'admin') return;
    setUsers(users.filter(u => u.username !== username));
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
              <Shield size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">لوحة الإدارة</h1>
              <p className="text-gray-500 text-sm">إدارة مستخدمي النظام</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition"
          >
            <LogOut size={18} />
            خروج
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Add User Form */}
          <div className="bg-white p-6 rounded-2xl shadow-sm h-fit">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <UserPlus size={20} className="text-blue-500" />
              إضافة مستخدم جديد
            </h2>
            <form onSubmit={addUser} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">اسم المستخدم</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">كلمة المرور</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
              >
                إضافة
              </button>
            </form>
          </div>

          {/* Users List */}
          <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users size={20} className="text-blue-500" />
              المستخدمين الحاليين ({users.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-right border-b text-gray-500 text-sm">
                    <th className="pb-3 font-medium">المستخدم</th>
                    <th className="pb-3 font-medium">كلمة المرور</th>
                    <th className="pb-3 font-medium">الرتبة</th>
                    <th className="pb-3 font-medium">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-gray-700">
                  {users.map((user) => (
                    <tr key={user.username} className="hover:bg-slate-50 transition">
                      <td className="py-4 font-medium">{user.username}</td>
                      <td className="py-4 font-mono text-sm">{user.password}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-md text-xs ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {user.role === 'admin' ? 'أدمن' : 'مستخدم'}
                        </span>
                      </td>
                      <td className="py-4">
                        {user.username !== 'admin' && (
                          <button
                            onClick={() => deleteUser(user.username)}
                            className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
