import { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Edit3, Shield, User as UserIcon, Home } from 'lucide-react';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' });
  const [editingUser, setEditingUser] = useState(null);

  // Load users from localStorage
  useEffect(() => {
    const savedUsers = JSON.parse(localStorage.getItem('users') || '[]');
    if (savedUsers.length === 0) {
      // إضافة المستخدم الافتراضي admin
      const defaultUsers = [{ id: 1, username: 'admin', password: 'admin123', role: 'admin' }];
      localStorage.setItem('users', JSON.stringify(defaultUsers));
      setUsers(defaultUsers);
    } else {
      setUsers(savedUsers);
    }
  }, []);

  // Add new user
  const handleAddUser = (e) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password) {
      alert('الرجاء إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    const userExists = users.find(u => u.username === newUser.username);
    if (userExists) {
      alert('اسم المستخدم موجود بالفعل');
      return;
    }

    const user = {
      id: Date.now(),
      ...newUser
    };

    const updatedUsers = [...users, user];
    setUsers(updatedUsers);
    localStorage.setItem('users', JSON.stringify(updatedUsers));
    setNewUser({ username: '', password: '', role: 'user' });
    setShowAddForm(false);
  };

  // Delete user
  const handleDeleteUser = (userId) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
      const updatedUsers = users.filter(u => u.id !== userId);
      setUsers(updatedUsers);
      localStorage.setItem('users', JSON.stringify(updatedUsers));
    }
  };

  // Update user
  const handleUpdateUser = (e) => {
    e.preventDefault();
    const updatedUsers = users.map(u => 
      u.id === editingUser.id ? editingUser : u
    );
    setUsers(updatedUsers);
    localStorage.setItem('users', JSON.stringify(updatedUsers));
    setEditingUser(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-400" />
              <h1 className="text-3xl font-bold text-white">إدارة المستخدمين</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.location.href = '/'}
                className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl transition transform hover:scale-105"
              >
                <Home className="w-5 h-5" />
                <span>الصفحة الرئيسية</span>
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition transform hover:scale-105"
              >
                <UserPlus className="w-5 h-5" />
                <span>إضافة مستخدم جديد</span>
              </button>
            </div>
          </div>
        </div>

        {/* Add User Form */}
        {showAddForm && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">مستخدم جديد</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-white mb-2">اسم المستخدم</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="أدخل اسم المستخدم"
                />
              </div>
              <div>
                <label className="block text-white mb-2">كلمة المرور</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="أدخل كلمة المرور"
                />
              </div>
              <div>
                <label className="block text-white mb-2">الدور</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="user">مستخدم عادي</option>
                  <option value="admin">مدير</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg transition"
                >
                  إضافة
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users List */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <h2 className="text-xl font-bold text-white mb-4">قائمة المستخدمين ({users.length})</h2>
          <div className="space-y-3">
            {users.map(user => (
              <div key={user.id} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition">
                {editingUser?.id === user.id ? (
                  <form onSubmit={handleUpdateUser} className="space-y-3">
                    <input
                      type="text"
                      value={editingUser.username}
                      onChange={(e) => setEditingUser({...editingUser, username: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                    />
                    <input
                      type="password"
                      value={editingUser.password}
                      onChange={(e) => setEditingUser({...editingUser, password: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                      placeholder="كلمة مرور جديدة (اختياري)"
                    />
                    <select
                      value={editingUser.role}
                      onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                    >
                      <option value="user">مستخدم عادي</option>
                      <option value="admin">مدير</option>
                    </select>
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded-lg">حفظ</button>
                      <button type="button" onClick={() => setEditingUser(null)} className="flex-1 bg-gray-600 text-white py-2 rounded-lg">إلغاء</button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        {user.role === 'admin' ? (
                          <Shield className="w-6 h-6 text-white" />
                        ) : (
                          <UserIcon className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="text-white font-bold">{user.username}</p>
                        <p className="text-sm text-white/60">
                          {user.role === 'admin' ? 'مدير' : 'مستخدم عادي'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                        disabled={user.username === 'admin'}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserManagement;
