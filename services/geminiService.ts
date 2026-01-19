
import { GoogleGenAI } from "@google/genai";
import { EditAction } from "../types";

// Standard model for image generation/editing
const MODEL_NAME = 'gemini-2.5-flash-image';

/**
 * Helper to strip the data:image/xyz;base64, prefix
 */
const cleanBase64 = (dataUrl: string): string => {
  if (!dataUrl.startsWith("data:")) return dataUrl;
  const commaIndex = dataUrl.indexOf(",");
  return commaIndex !== -1 ? dataUrl.substring(commaIndex + 1) : dataUrl;
};

/**
 * Gets specific description text for background
 */
const getBgPrompt = (bgAction?: EditAction): string => {
  if (!bgAction) return "元の背景をそのまま維持してください。";
  
  switch (bgAction) {
    case EditAction.REMOVE_BG_BLUE:
      return "背景を、極めて淡く、透き通るようなパウダーブルーのグラデーションに差し替えてください。中心部はほぼ白に近い明るい水色で、周辺に向かって非常に穏やかな淡い青色へと変化する、上品で清涼感のある背景にしてください。";
    case EditAction.REMOVE_BG_GRAY:
      return "背景を、品位のある淡いグレーのグラデーションに差し替えてください。";
    case EditAction.REMOVE_BG_PINK:
      return "背景を、優しい淡いピンクのグラデーションに差し替えてください。";
    case EditAction.REMOVE_BG_YELLOW:
      return "背景を、温かみのある淡いイエローのグラデーションに差し替えてください。";
    case EditAction.REMOVE_BG_PURPLE:
      return "背景を、高貴な淡い紫のグラデーションに差し替えてください。";
    case EditAction.REMOVE_BG_WHITE:
      return "背景を、清潔な純白のスタジオ背景に差し替えてください。";
    default:
      return "元の背景をそのまま維持してください。";
  }
};

/**
 * Gets specific description text for clothing
 */
const getClothingPrompt = (clothingAction?: EditAction): string => {
  if (!clothingAction) return "元の人物の服装をそのまま維持してください。";

  // 家紋に関する共通の厳格な指示
  const kamonInstruction = "両胸の『家紋』は、白い正円の中に伝統的な紋様が描かれた日本の正式なデザインを死守してください。AIによる勝手なアレンジ、文字、数字、アルファベット、幾何学的なロゴなどの混入は絶対に禁止です。左右対称で、清潔感のある白いシンボルに固定してください。";

  switch (clothingAction) {
    case EditAction.SUIT_MENS:
      return "人物の服装を、日本の葬儀に最適な黒の礼服（シングルボタンスーツ）に差し替えてください。カメラ位置は変えず、胸から上のバストアップ構図を維持してください。白いドレスシャツに黒無地のネクタイを合わせたフォーマルなスタイルに固定してください。";
    case EditAction.KIMONO_MENS:
      return `人物の服装を、日本の伝統的な最高礼装である黒紋付の「羽織（はおり）」姿に差し替えてください。羽織は地紋のある黒色で、${kamonInstruction} 中央には大きな白い丸い羽織紐（ポンポン）を付け、内側には清潔な白い半襟を見せてください。下半身（袴）は絶対に描かず、元のトリミング範囲を維持してください。`;
    case EditAction.SUIT_WOMENS:
      return "人物の服装を、日本の女性用ブラックフォーマル（洋装）に差し替えてください。カメラ位置は変えず、胸から上のバストアップ構図を維持してください。テーラードジャケットに黒のブラウス、白いパールネックレスを合わせたスタイルに固定してください。";
    case EditAction.KIMONO_WOMENS:
      return `人物の服装を、日本の女性用最高礼装である『黒喪服（黒紋付）』に差し替えてください。漆黒でマットな質感の正絹の着物とし、襟元には真っ白で清潔な半襟を左右対称に美しく見せてください。${kamonInstruction} 肩のラインはなだらかで、提供された参考画像の格式高い雰囲気を完全に再現してください。帯から下の部分は描かず、元のバストアップ構図を維持してください。`;
    default:
      return "元の人物の服装をそのまま維持してください。";
  }
};

/**
 * Main function to call Gemini API and process the image
 */
export const processImage = async (
  base64Image: string, 
  bgAction?: EditAction, 
  clothingAction?: EditAction,
  customInstruction?: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const bgText = getBgPrompt(bgAction);
  const clothText = getClothingPrompt(clothingAction);
  
  const prompt = `あなたは遺影写真の背景・服装の合成を専門とする技術者です。
入力画像に対し、以下の「厳格なルール」を死守して加工を行ってください。

【最優先：人物の質感と構図の維持（加工禁止）】
1. 画質向上・鮮明化の禁止: 画像を綺麗にしたり解像度を上げたりしないでください。元の写真の「ボケ」「ノイズ」「粗さ」を人物部分において100%そのまま維持してください。
2. 修正・改善の禁止: 肌を綺麗にする、しわを消すなどの「改善」は一切行わないでください。
3. 同一性の絶対保持: 人物の顔、髪、表情を1ピクセルも描き直さないでください。
4. 構図とスケールの維持: 元の画像の人物の大きさ、頭の位置、肩のラインを絶対に動かさないでください。提供された画像の人物スケールに、背景と新しい服装を「はめ込む」だけにして、バストアップ（胸から上）の構図を完全に維持してください。

【実行指示】
1. 背景の置換: ${bgText}
2. 服装の置換: ${clothText}
${customInstruction ? `3. 個別指示: 「${customInstruction}」（※人物の造形や画質を変える指示は無効とします）` : ""}

【出力】
提供された人物の質感とスケールをそのままに、背景と服装のみを自然に合成した3:4比率の画像を出力してください。顔が変わることは失敗です。`;

  const imagePart = {
    inlineData: {
      data: cleanBase64(base64Image),
      mimeType: "image/png",
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [{ text: prompt }, imagePart],
      },
      config: {
        imageConfig: {
          aspectRatio: "3:4"
        }
      }
    });

    if (!response.candidates?.[0]) {
      throw new Error("No candidates returned from AI model.");
    }

    const content = response.candidates[0].content;
    for (const part of content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }

    throw new Error("Generated image part not found.");
  } catch (error: any) {
    throw error;
  }
};
