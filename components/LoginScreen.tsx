
import React, { useState } from 'react';
import { authService, AuthSession } from '../services/authService';

interface LoginScreenProps {
  onLogin: (session: AuthSession) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !password) {
      setError('加盟店IDとパスワードを入力してください。');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      //authServiceを呼び出して認証を実行
      const session = await authService.login(employeeId, password);
      onLogin(session);
    } catch (err: any) {
      setError(err.message || 'ログインに失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-900 rounded-full text-white font-serif font-bold text-2xl mb-4 shadow-lg">
            瞬
          </div>
          <h2 className="text-2xl font-serif font-bold text-gray-800 tracking-tight">システムログイン</h2>
          <p className="text-gray-400 text-[10px] mt-1 uppercase tracking-widest font-sans">SHUNNEI System Access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1 font-sans uppercase tracking-wider">加盟店ID</label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-800 focus:border-transparent outline-none transition-all text-sm font-sans"
                placeholder="IDを入力してください"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1 font-sans uppercase tracking-wider">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-800 focus:border-transparent outline-none transition-all text-sm font-sans"
                placeholder="パスワードを入力してください"
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-[11px] py-3 px-4 rounded-xl border border-red-100 flex items-center gap-2 animate-shake font-sans">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 font-sans"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : 'ログイン'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-[10px] text-gray-500 space-y-2 font-sans text-center leading-relaxed">
          <p>加盟店IDを紛失された場合は、本部までお問い合わせください。</p>
        </div>
      </div>
      <p className="text-center text-gray-400 text-[10px] mt-6 tracking-widest font-sans">
        &copy; {new Date().getFullYear()} 瞬影-SHUNNEI-
      </p>
    </div>
  );
};

export default LoginScreen;
