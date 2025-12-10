import { GoogleGenAI } from "@google/genai";
import { Transaction, TaskCategory } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateWeeklyReport = async (
  childName: string,
  transactions: Transaction[]
): Promise<string> => {
  try {
    const earningHistory = transactions
      .filter(t => t.type === 'EARN')
      .map(t => `${t.description}: +${t.amount} 分鐘 (${t.category})`)
      .join('\n');

    const spendingHistory = transactions
      .filter(t => t.type === 'SPEND')
      .map(t => `${t.description}: ${t.amount} 分鐘`)
      .join('\n');

    const prompt = `
      扮演一位支持性的育兒教練。請分析孩子 "${childName}" 本週的活動紀錄。
      請使用繁體中文 (Traditional Chinese) 回答。

      賺取紀錄 (Earning History):
      ${earningHistory}

      消費紀錄 (Spending History):
      ${spendingHistory}

      請提供一段約 3 句話的總結：
      1. 肯定他們的努力（具體提到他們做得好的類別）。
      2. 觀察他們的螢幕時間使用情況。
      3. 給予下週一個正向、鼓勵的建議。
      語氣要溫暖、鼓勵且簡潔。
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "目前無法生成報告。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI 服務目前無法使用，請檢查您的網路連線。";
  }
};

export const suggestTasks = async (
  interest: string
): Promise<{ title: string; description: string; reward: number; category: string }[]> => {
  try {
    const prompt = `
      針對對 "${interest}" 感興趣的孩子，建議 3 個有創意的家務或學習任務。
      請只回傳一個 Raw JSON Array (不要 markdown code blocks)，包含以下物件：
      - title (string): 任務標題 (請用繁體中文 Traditional Chinese)
      - description (string): 任務描述 (請用繁體中文 Traditional Chinese)
      - reward (number): 獎勵分鐘數 (介於 5 到 30 之間)
      - category (string): 類別，必須是以下英文之一: Reading, Outdoor, Chore, Study, Health, Other
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) return [];
    
    // Clean up any potential markdown formatting just in case
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini Suggestion Error", error);
    return [];
  }
};

export const analyzeProofImage = async (
  base64Image: string,
  taskTitle: string
): Promise<{ score: number; comment: string }> => {
  try {
    // Strip data URL prefix if present to get pure base64
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `
      你是一個嚴格但公平的任務審核員。
      孩子聲稱完成了任務："${taskTitle}" 並上傳了這張照片作為證明。
      請分析這張照片是否提供了完成任務的合理證據。
      
      請回傳 JSON 格式：
      {
        "score": (0-100 的整數，越高代表越有可能是真的完成),
        "comment": (一句簡短的繁體中文評語，說明你看到了什麼，以及是否符合任務要求)
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) return { score: 0, comment: "無法分析圖片" };
    
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);

  } catch (error) {
    console.error("Gemini Vision Error", error);
    return { score: 0, comment: "AI 視覺分析暫時無法使用" };
  }
};