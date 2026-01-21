
import { CompanyInfo } from '../types';

export interface AuthSession {
  company: CompanyInfo;
  token: string;
}

/**
 * 文字列をSHA-256ハッシュに変換する
 */
async function computeSHA256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export const authService = {
  /**
   * ログイン認証処理 (サーバーAPI呼び出し)
   */
  async login(id: string, password: string): Promise<AuthSession> {
    const passwordHash = await computeSHA256(password);

    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, passwordHash }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'ログインに失敗しました。');
    }

    const session = await response.json() as AuthSession;
    // セキュリティのため sessionStorage を使用（ブラウザを閉じるとクリア）
    sessionStorage.setItem('shunnei_session', JSON.stringify(session));
    return session;
  },

  /**
   * 保存されているセッションを取得
   */
  getSession(): AuthSession | null {
    const stored = sessionStorage.getItem('shunnei_session');
    if (!stored) return null;
    try {
      return JSON.parse(stored) as AuthSession;
    } catch (e) {
      return null;
    }
  },

  /**
   * ログアウト処理
   */
  logout(): void {
    sessionStorage.removeItem('shunnei_session');
  }
};
