
import { GoogleGenAI } from "@google/genai";
import { EditAction } from "../types";

const MODEL_NAME = 'gemini-2.5-flash-image';

const cleanBase64 = (dataUrl: string): string => {
  if (!dataUrl.startsWith("data:")) return dataUrl;
  const commaIndex = dataUrl.indexOf(",");
  return commaIndex !== -1 ? dataUrl.substring(commaIndex + 1) : dataUrl;
};

/**
 * 画像から人物のみを抽出し、背景を純白(#FFFFFF)に置き換える
 */
export const extractPerson = async (base64Image: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const mimeType = base64Image.match(/data:([^;]+);/)?.[1] || "image/png";

  const prompt = `あなたはプロのレタッチエンジニアです。
入力画像から「人物（顔、髪、体、着ている服）」のみを完璧に切り抜き、背景を「純白（#FFFFFF）」に置き換えてください。

【厳格なルール】
1. 人物の造形、表情、ライティング、ポーズ、解像度、質感（ノイズやボケ）を1ピクセルも変更しないでください。
2. 背景は一切の影やグラデーションを排除した、完全な「#FFFFFF」の単色にしてください。
3. 人物の境界線（髪の毛など）を非常に丁寧に処理してください。
4. 人物の大きさ、配置を元の画像と完全に一致させてください。

出力は、元の人物の質感を維持したまま、背景を白にした画像1枚のみとしてください。`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [{ text: prompt }, { inlineData: { data: cleanBase64(base64Image), mimeType } }],
      },
      config: { imageConfig: { aspectRatio: "3:4" } }
    });

    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!part?.inlineData) throw new Error("人物の抽出に失敗しました。");
    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
  } catch (error: any) {
    console.error("Extraction Error:", error);
    throw error;
  }
};

/**
 * 服装を着せ替え、背景を純白(#FFFFFF)にして出力する
 */
export const changeClothing = async (base64Image: string, action: EditAction): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const mimeType = base64Image.match(/data:([^;]+);/)?.[1] || "image/png";

  let clothText = "";
  const kamonInstruction = "両胸の家紋は白い正円の中に伝統的な紋様を描いた日本の正式なデザインに固定してください。";

  switch (action) {
    case EditAction.SUIT_MENS:
      clothText = "黒の礼服スーツ、白いシャツ、黒い無地のネクタイ";
      break;
    case EditAction.KIMONO_MENS:
      clothText = `黒紋付の羽織姿。中央に白い羽織紐、${kamonInstruction}`;
      break;
    case EditAction.SUIT_WOMENS:
      clothText = "女性用ブラックフォーマル、黒のブラウス、白いパールネックレス";
      break;
    case EditAction.KIMONO_WOMENS:
      clothText = `黒喪服（黒紋付）。白い半襟を美しく見せ、${kamonInstruction}`;
      break;
  }

  const prompt = `あなたは遺影専門の着せ替えエンジニアです。
入力画像の人物の「顔と表情」を完全に維持したまま、服装を「${clothText}」に差し替えてください。

【厳格なルール】
1. 人物の顔、髪型、表情を1ピクセルも変えないでください。
2. 服装のみを指定されたものに描き直してください。
3. 背景は一切の影がない完全な「純白（#FFFFFF）」にしてください。
4. 人物の配置と大きさを元の画像と完全に一致させてください。

出力は、背景を白にした加工後の画像1枚のみとしてください。`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [{ text: prompt }, { inlineData: { data: cleanBase64(base64Image), mimeType } }],
      },
      config: { imageConfig: { aspectRatio: "3:4" } }
    });

    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!part?.inlineData) throw new Error("服装の着せ替えに失敗しました。");
    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
  } catch (error: any) {
    console.error("Clothing Change Error:", error);
    throw error;
  }
};

// 互換性のためのダミー
export const processImage = async () => "";
export const repairHeicImage = async (base64Heic: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const imagePart = { inlineData: { data: cleanBase64(base64Heic), mimeType: "image/heic" } };
    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: { parts: [{ text: "Convert to high quality JPEG." }, imagePart] },
        config: { imageConfig: { aspectRatio: "3:4" } }
    });
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    return `data:${part!.inlineData!.mimeType};base64,${part!.inlineData!.data}`;
};
