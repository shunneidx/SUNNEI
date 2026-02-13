
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
背景を完全に除去し、ムラのない均一な「#00FF00 (純粋な緑)」で塗りつぶしてください。

【注意】
1. 顔の微細なディテール（瞳の中の光、皮膚の質感、シワ）を絶対に滑らかにしないでください。
2. 背景との境界線付近に元の背景色を残さないでください。
3. 背景には影や照明効果を一切入れず、フラットなベタ塗りにしてください。
4. 出力サイズとアスペクト比(3:4)を厳守してください。`;

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

  const prompt = `顔のパーツ位置と表情を完全に維持したまま、服装のみを「${clothText}」に変更してください。

【最重要】
1. 顔（目、鼻、口）は1ピクセルも描き直したり動かしたりしないでください。
2. 背景は一切の影やムラがない「#00FF00 (純粋な緑)」で塗りつぶしてください。
3. 服の生地は写真として自然な質感（布の織り目など）を表現し、不自然な光沢を避けてください。
4. 首元の境界を自然に繋げてください。`;

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
