import { useState } from 'react';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
        // التحقق من المستخدمين المخزنين في localStorage
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    // إذا لم يكن هناك مستخدمين، إضافة المستخدم الافتراضي
    if (users.length === 0) {
      const defaultUser = { id: 1, username: 'admin', password: 'admin123', role: 'admin' };
      users.push(defaultUser);
      localStorage.setItem('users', JSON.stringify(users));
    }
    
    // البحث عن المستخدم
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
      const userRole = user.role;
      onLogin(true);
      localStorage.setItem('currentUser', JSON.stringify(user));
      localStorage.setItem('userRole', userRole);
      localStorage.setItem('isLoggedIn', 'true');  setError('اسم المستخدم أو كلمة المرور غير صحيحة');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">مجدول فيسبوك الذكي</h1>
          <p className="text-gray-600">تسجيل الدخول إلى حسابك</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
              اسم المستخدم
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="أدخل اسم المستخدم"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              كلمة المرور
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="أدخل كلمة المرور"
              required
            />
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 transform hover:scale-105"
          >
            تسجيل الدخول
          </button>
        </form>


      </div>
    </div>
  );
}

export default Login;
