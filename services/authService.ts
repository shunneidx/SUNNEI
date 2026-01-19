
import { CompanyInfo, UserPlan } from '../types';

/**
 * 加盟店リスト（手動管理用）
 * 
 * 運用手順:
 * 1. 任意のSHA-256変換ツールでパスワードをハッシュ化します
 * 2. 下記のリストに ID, 名前, プラン, ハッシュ値を貼り付けます
 */
const MOCK_ACCOUNTS: Record<string, { name: string; plan: UserPlan; passwordHash: string }> = {
  // パスワード: password123 (デモ用)
  'demo_std': { 
    name: 'デモ葬儀社', 
    plan: UserPlan.STANDARD, 
    passwordHash: 'ef92b778ba7158340a062bf7047335d47ac0070501a31d9774f260193a027376' 
  },
  // パスワード: admin_pass (デモ用)
  'demo_ent': { 
    name: '瞬影メモリアル 本部', 
    plan: UserPlan.ENTERPRISE, 
    passwordHash: '2064505391c53229b43343603d6f78f888da76c81335359c381f621350a4d538' 
  },
  /* 
    ここに新規加盟店を追加してください 
    'id': { name: '社名', plan: UserPlan.LITE, passwordHash: '...' },
  */
};

export interface AuthSession {
  company: CompanyInfo;
  token: string;
}

/**
 * 文字列をSHA-256ハッシュに変換する（ブラウザ標準APIを使用）
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
   * ログイン認証処理
   */
  async login(id: string, password: string): Promise<AuthSession> {
    // ネットワーク遅延のシミュレーション（ユーザー体験のため）
    await new Promise(resolve => setTimeout(resolve, 800));

    const account = MOCK_ACCOUNTS[id];
    if (!account) {
      throw new Error('加盟店IDまたはパスワードが正しくありません。');
    }

    // 入力されたパスワードをハッシュ化して比較
    const inputHash = await computeSHA256(password);
    if (inputHash !== account.passwordHash) {
      throw new Error('加盟店IDまたはパスワードが正しくありません。');
    }

    const session: AuthSession = {
      company: {
        id: id,
        name: account.name,
        plan: account.plan,
      },
      token: `session-${Math.random().toString(36).substring(2)}`
    };

    localStorage.setItem('shunnei_session', JSON.stringify(session));
    return session;
  },

  /**
   * 保存されているセッションを取得
   */
  getSession(): AuthSession | null {
    const stored = localStorage.getItem('shunnei_session');
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
    localStorage.removeItem('shunnei_session');
  }
};
