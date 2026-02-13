
import { GoogleGenAI } from "@google/genai";
import { EditAction } from "../types";

const MODEL_NAME = 'gemini-2.5-flash-image';

const cleanBase64 = (dataUrl: string): string => {
  if (!dataUrl.startsWith("data:")) return dataUrl;
  const commaIndex = dataUrl.indexOf(",");
  return commaIndex !== -1 ? dataUrl.substring(commaIndex + 1) : dataUrl;
};

/**
 * 人物抽出プロンプト
 */
export const extractPerson = async (base64Image: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const mimeType = base64Image.match(/data:([^;]+);/)?.[1] || "image/png";

  const prompt = `遺影作成のための人物分離タスクです。
入力画像から人物を分離し、背景を「#00FF00 (純粋な緑)」に置き換えてください。

【注意】
1. 顔の造形、特に瞳の輝きや虹彩、肌のシワ、表情を「滑らかに」したり「修正」したりしないでください。そのまま維持してください。
2. 髪の毛の境界線を丁寧に処理し、背景の緑が混ざらないようにしてください。
3. 出力サイズとアスペクト比(3:4)を厳守してください。`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [{ text: prompt }, { inlineData: { data: cleanBase64(base64Image), mimeType } }],
      },
      config: { imageConfig: { aspectRatio: "3:4" } }
    });
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!part?.inlineData) throw new Error("抽出失敗");
    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

/**
 * 服装着せ替えプロンプト
 */
export const changeClothing = async (base64Image: string, action: EditAction): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const mimeType = base64Image.match(/data:([^;]+);/)?.[1] || "image/png";

  let clothText = "";
  switch (action) {
    case EditAction.SUIT_MENS: clothText = "男性用のフォーマルな黒の礼服、白いシャツ、黒いネクタイ"; break;
    case EditAction.KIMONO_MENS: clothText = "男性用の黒紋付羽織袴（和装）"; break;
    case EditAction.SUIT_WOMENS: clothText = "女性用の黒の喪服、パールのネックレス、黒いブラウス"; break;
    case EditAction.KIMONO_WOMENS: clothText = "女性用の黒紋付喪服（和装）、白い半襟"; break;
  }

  const prompt = `人物の顔は一切変えずに、服装のみを「${clothText}」に着せ替えてください。

【最重要】
1. 顔パーツ（目、鼻、口、耳）の位置とディテールを1ピクセルも動かさないでください。
2. 服の質感は、マットすぎず、写真として自然な布の質感にしてください。
3. 背景は「#00FF00」で塗りつぶしてください。
4. 元の人物の首の位置と体型を維持して合成してください。`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [{ text: prompt }, { inlineData: { data: cleanBase64(base64Image), mimeType } }],
      },
      config: { imageConfig: { aspectRatio: "3:4" } }
    });
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!part?.inlineData) throw new Error("着せ替え失敗");
    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const repairHeicImage = async (base64Heic: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: { parts: [{ text: "Convert to high quality 3:4 JPEG." }, { inlineData: { data: cleanBase64(base64Heic), mimeType: "image/heic" } }] },
        config: { imageConfig: { aspectRatio: "3:4" } }
    });
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    return `data:${part!.inlineData!.mimeType};base64,${part!.inlineData!.data}`;
};
