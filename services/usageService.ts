
export const usageService = {
  /**
   * サーバー側の利用枚数を1増やす
   */
  async incrementUsage(companyId: string): Promise<number> {
    const response = await fetch('/api/usage/increment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ companyId }),
    });

    if (!response.ok) {
      throw new Error('利用枚数の更新に失敗しました。');
    }

    const data = await response.json();
    return data.usageCount;
  }
};
