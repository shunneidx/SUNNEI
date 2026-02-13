
import { GoogleGenAI } from "@google/genai";
import { EditAction } from "../types";

const MODEL_NAME = 'gemini-2.5-flash-image';

const cleanBase64 = (dataUrl: string): string => {
  if (!dataUrl.startsWith("data:")) return dataUrl;
  const commaIndex = dataUrl.indexOf(",");
  return commaIndex !== -1 ? dataUrl.substring(commaIndex + 1) : dataUrl;
};

/**
 * 画像から人物のみを抽出し、背景をクロマキー用の「鮮やかな緑色(#00FF00)」に置き換える
 */
export const extractPerson = async (base64Image: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const mimeType = base64Image.match(/data:([^;]+);/)?.[1] || "image/png";

  const prompt = `あなたは世界最高峰のフォトレタッチャーです。
入力画像から人物を完璧に分離し、背景をクロマキー合成用の「鮮やかな緑色 (#00FF00)」に置き換えてください。

【厳格な遵守事項】
1. 人物の造形、顔、表情、髪型、服装の質感、ライティングを1%も変更しないでください。
2. 背景は影やムラの一切ない、完全な単色「#00FF00」のみで構成してください。
3. 髪の毛1本1本まで丁寧に境界線を処理し、グリーンの背景と明確に区別できるようにしてください。
4. 人物のポーズ、大きさ、配置を元の画像から一切変えないでください（アスペクト比 3:4 を維持）。

出力は、背景をグリーンにした画像1枚のみとしてください。`;

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
 * 服装を着せ替え、背景を鮮やかな緑色(#00FF00)にして出力する
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
人物の「顔と表情」を完全に維持したまま、服装を「${clothText}」に差し替えてください。

【厳格なルール】
1. 人物の顔、髪型、表情を1ピクセルも変えないでください。元の人物そのものであることが最優先です。
2. 服装のみを指示通りに描き直してください。
3. 背景はクロマキー合成用の「鮮やかな緑色 (#00FF00)」にしてください。
4. 人物の配置と大きさを元の画像と完全に一致させ、アスペクト比 3:4 を守ってください。

出力は、背景をグリーンにした加工画像1枚のみとしてください。`;

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

export const repairHeicImage = async (base64Heic: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const imagePart = { inlineData: { data: cleanBase64(base64Heic), mimeType: "image/heic" } };
    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: { parts: [{ text: "Convert to high quality JPEG 3:4." }, imagePart] },
        config: { imageConfig: { aspectRatio: "3:4" } }
    });
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    return `data:${part!.inlineData!.mimeType};base64,${part!.inlineData!.data}`;
};
