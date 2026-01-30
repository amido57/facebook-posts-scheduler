import { useState, useEffect } from 'react';

// Component for admin to view and approve pending users.
function UserManagement() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchPending = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/users/pending', { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setPendingUsers(data.users || []);
      } else {
        setError('فشل جلب المستخدمين المعلّقين.');
      }
    } catch (err) {
      console.error(err);
      setError('فشل الاتصال بالخادم.');
    }
    setLoading(false);
  };

  const approve = async (userId) => {
    setError('');
    setMessage('');
    try {
      const res = await fetch(`/api/users/${userId}/approve`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setMessage(`تمت الموافقة على المستخدم ${data.user.email}.`);
        // Remove the approved user from pending list
        setPendingUsers(pendingUsers.filter(u => u.id !== userId));
      } else {
        setError('فشل الموافقة على المستخدم.');
      }
    } catch (err) {
      console.error(err);
      setError('فشل الاتصال بالخادم.');
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">إدارة الحسابات المعلّقة</h1>
          <p className="text-white/70 mb-4">يمكنك هنا الموافقة على الحسابات الجديدة.</p>
          {message && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4">{message}</div>}
          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}
          <button onClick={fetchPending} className="mb-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">تحديث القائمة</button>
          {loading ? (
            <p className="text-white">جاري التحميل...</p>
          ) : pendingUsers.length === 0 ? (
            <p className="text-white">لا يوجد مستخدمون في انتظار الموافقة.</p>
          ) : (
            <div className="space-y-3">
              {pendingUsers.map((user) => (
                <div key={user.id} className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold">{user.email}</p>
                    <p className="text-sm text-white/60">{user.name || 'بدون اسم'} - {user.role}</p>
                  </div>
                    <button onClick={() => approve(user.id)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">الموافقة</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserManagement;