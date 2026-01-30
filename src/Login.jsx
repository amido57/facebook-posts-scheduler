import { useState } from 'react';

function Login({ onLogin }) {
  const [showSignup, setShowSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Login using backend API
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!data.ok) {
        switch (data.error) {
          case 'ACCOUNT_NOT_APPROVED':
            setError('حسابك في انتظار موافقة المدير.');
            break;
          case 'INVALID_CREDENTIALS':
            setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
            break;
          default:
            setError('حدث خطأ أثناء تسجيل الدخول.');
        }
      } else {
        onLogin(true, data.user.role);
        localStorage.setItem('userRole', data.user.role);
        localStorage.setItem('isLoggedIn', 'true');
      }
    } catch (err) {
      console.error(err);
      setError('فشل الاتصال بالخادم.');
    }
  };

  // Signup using backend API
  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!name.trim()) {
      setError('الرجاء إدخال الاسم.');
      return;
    }
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, name })
      });
      const data = await res.json();
      if (!data.ok) {
        if (data.error === 'EMAIL_ALREADY_EXISTS') {
          setError('هذا البريد الإلكتروني مستخدم بالفعل.');
        } else if (data.error === 'EMAIL_AND_PASSWORD_REQUIRED') {
          setError('الرجاء إدخال البريد وكلمة المرور.');
        } else {
          setError('فشل التسجيل.');
        }
      } else {
        if (data.pending) {
          setMessage('تم التسجيل بنجاح! حسابك ينتظر موافقة المدير.');
          setShowSignup(false);
        } else {
          onLogin(true, data.user.role);
          localStorage.setItem('userRole', data.user.role);
          localStorage.setItem('isLoggedIn', 'true');
        }
      }
    } catch (err) {
      console.error(err);
      setError('فشل الاتصال بالخادم.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">مجدول فيسبوك الذكي</h1>
          <p className="text-gray-600">{showSignup ? 'إنشاء حساب جديد' : 'تسجيل الدخول إلى حسابك'}</p>
        </div>
        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4">
            {message}
          </div>
        )}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        {!showSignup ? (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">البريد الإلكتروني</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="أدخل البريد الإلكتروني"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">كلمة المرور</label>
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
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 transform hover:scale-105"
            >
              تسجيل الدخول
            </button>
            <p className="text-sm text-gray-600 text-center mt-2">
              ليس لديك حساب؟{' '}
              <button type="button" onClick={() => { setShowSignup(true); setMessage(''); setError(''); }} className="text-blue-600 hover:underline">
                إنشاء حساب
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-6">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">الاسم</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="أدخل اسمك الكامل"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email-signup">البريد الإلكتروني</label>
              <input
                id="email-signup"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="أدخل بريدك الإلكتروني"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password-signup">كلمة المرور</label>
              <input
                id="password-signup"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="أدخل كلمة المرور"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 transform hover:scale-105"
            >
              تسجيل
            </button>
            <p className="text-sm text-gray-600 text-center mt-2">
              لديك حساب بالفعل؟{' '}
              <button type="button" onClick={() => { setShowSignup(false); setMessage(''); setError(''); }} className="text-blue-600 hover:underline">
                تسجيل الدخول
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default Login;