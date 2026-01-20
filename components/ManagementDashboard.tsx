
import React, { useState, useEffect } from 'react';
import { UserPlan, PLAN_LIMITS } from '../types';

interface ClientData {
  id: string;
  name: string;
  plan: UserPlan;
  usage_count: number;
  contact_person: string;
  created_at: string;
}

const ManagementDashboard: React.FC = () => {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    id: '',
    name: '',
    plan: UserPlan.STANDARD,
    contactPerson: '',
    password: 'password123' // 初期パスワード
  });

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/companies');
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleRegisterClient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // パスワードのハッシュ化（簡易版：SHA-256）
    const msgUint8 = new TextEncoder().encode(newClientForm.password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    try {
      const res = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newClientForm.id,
          name: newClientForm.name,
          plan: newClientForm.plan,
          contactPerson: newClientForm.contactPerson,
          passwordHash
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        setNewClientForm({ id: '', name: '', plan: UserPlan.STANDARD, contactPerson: '', password: 'password123' });
        fetchClients();
      } else {
        alert('登録に失敗しました。IDが重複している可能性があります。');
      }
    } catch (error) {
      alert('通信エラーが発生しました。');
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (id === 'admin') return alert('管理者は削除できません。');
    if (!window.confirm('この加盟店を削除しますか？データは復旧できません。')) return;

    try {
      const res = await fetch(`/api/admin/companies/${id}`, { method: 'DELETE' });
      if (res.ok) fetchClients();
    } catch (error) {
      alert('削除に失敗しました。');
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.includes(searchQuery) || c.id.includes(searchQuery)
  );

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 animate-fade-in bg-gray-50/50 min-h-full font-sans">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-gray-800 flex items-center gap-3">
            <span className="bg-gray-800 text-white w-8 h-8 rounded flex items-center justify-center text-sm font-serif">瞬</span>
            管理ダッシュボード
          </h2>
          <p className="text-sm text-gray-500 mt-1">加盟店データベース・利用状況監視</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-sm transition-all flex items-center gap-2 cursor-pointer"
        >
          新規加盟店登録
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-bold uppercase">全作成数</p>
          <p className="text-3xl font-bold mt-1">{clients.reduce((acc, c) => acc + c.usage_count, 0)} <span className="text-sm font-normal text-gray-400">枚</span></p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-bold uppercase">稼働社数</p>
          <p className="text-3xl font-bold mt-1">{clients.length} <span className="text-sm font-normal text-gray-400">社</span></p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xl font-bold">システム稼働中</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold">加盟店一覧</h3>
          <input 
            type="text" placeholder="検索..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none w-64 bg-white"
          />
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-20 text-center text-gray-400">読込中...</div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">ID / 名前</th>
                  <th className="px-6 py-3">プラン / 担当</th>
                  <th className="px-6 py-3">利用状況</th>
                  <th className="px-6 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredClients.map(client => {
                  const limit = PLAN_LIMITS[client.plan as UserPlan];
                  const percent = limit === Infinity ? 0 : (client.usage_count / limit) * 100;
                  return (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-[10px] text-gray-400">ID: {client.id}</div>
                        <div className="font-bold">{client.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-blue-600 font-bold text-xs">{client.plan}</div>
                        <div className="text-gray-500">{client.contact_person}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-between text-[10px] mb-1">
                          <span>{client.usage_count} / {limit === Infinity ? '∞' : limit}</span>
                        </div>
                        <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${percent > 90 ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {client.id !== 'admin' && (
                          <button onClick={() => handleDeleteClient(client.id)} className="text-gray-300 hover:text-red-600 transition-colors cursor-pointer">削除</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="bg-gray-800 p-4 text-white font-bold flex justify-between">
              新規加盟店登録
              <button onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleRegisterClient} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">加盟店ID (英数字)</label>
                <input required type="text" value={newClientForm.id} onChange={e => setNewClientForm({...newClientForm, id: e.target.value})} className="w-full px-3 py-2 border rounded" placeholder="shop01" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">加盟店名</label>
                <input required type="text" value={newClientForm.name} onChange={e => setNewClientForm({...newClientForm, name: e.target.value})} className="w-full px-3 py-2 border rounded" placeholder="瞬影葬儀社" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">契約プラン</label>
                <select value={newClientForm.plan} onChange={e => setNewClientForm({...newClientForm, plan: e.target.value as UserPlan})} className="w-full px-3 py-2 border rounded bg-white">
                  <option value={UserPlan.LITE}>ライト (60枚)</option>
                  <option value={UserPlan.STANDARD}>スタンダード (200枚)</option>
                  <option value={UserPlan.ENTERPRISE}>エンタープライズ (無制限)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">担当者名</label>
                <input required type="text" value={newClientForm.contactPerson} onChange={e => setNewClientForm({...newClientForm, contactPerson: e.target.value})} className="w-full px-3 py-2 border rounded" placeholder="山田 太郎" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">初期パスワード</label>
                <input required type="text" value={newClientForm.password} onChange={e => setNewClientForm({...newClientForm, password: e.target.value})} className="w-full px-3 py-2 border rounded" />
              </div>
              <button type="submit" className="w-full py-3 bg-emerald-600 text-white font-bold rounded shadow-lg active:scale-95 transition-all cursor-pointer">登録を実行する</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagementDashboard;
