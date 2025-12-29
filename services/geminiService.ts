
import { GoogleGenAI, Type, Modality } from "@google/genai";

export async function enrichWord(character: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide details for the Chinese word: "${character}". Give the pinyin, primary Vietnamese meaning, word type (e.g., Noun, Verb, Adjective in Vietnamese), a brief grammar note or usage tip in Vietnamese, a natural Chinese example sentence, the pinyin for that example sentence, and the Vietnamese translation of that example sentence separately. 
      Also, provide a detailed "radicalAnalysis" in Vietnamese, explaining the components/radicals that make up the character (e.g., for "妈", you would say "Gồm bộ Nữ (女 - phụ nữ) và chữ Mã (马 - con ngựa) đóng vai trò biểu âm").`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pinyin: { type: Type.STRING },
            meaning: { type: Type.STRING },
            wordType: { type: Type.STRING, description: "Type of word in Vietnamese" },
            grammarNote: { type: Type.STRING, description: "Short grammar note in Vietnamese" },
            radicalAnalysis: { type: Type.STRING, description: "Analysis of radicals/components in Vietnamese" },
            example: { type: Type.STRING },
            examplePinyin: { type: Type.STRING },
            exampleTranslation: { type: Type.STRING },
          },
          required: ["pinyin", "meaning", "wordType", "grammarNote", "radicalAnalysis", "example", "examplePinyin", "exampleTranslation"],
        },
      },
    });

    const jsonStr = response.text || '{}';
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini Enrichment Error:", error);
    return null;
  }
}

export async function generateReflexResponse(
  history: { role: 'user' | 'model', content: string }[],
  targetWords: string[],
  scenario: string
) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Bạn là một giáo viên dạy tiếng Trung bản xứ đang giúp người dùng luyện phản xạ giao tiếp.
      Bối cảnh: ${scenario}
      Các từ vựng mục tiêu cần người dùng sử dụng: ${targetWords.join(', ')}
      
      QUY TẮC ĐẶC BIỆT CHO ĐẦU VÀO CỦA USER:
      - Nếu người dùng nhập tiếng Việt hoặc tiếng Anh, hãy dịch nó sang tiếng Trung chuẩn xác nhất trong "translatedUserChinese" và coi đó là câu trả lời của họ.
      - Nếu người dùng đã nhập tiếng Trung, hãy để "translatedUserChinese" giống với đầu vào.
      
      TRẢ VỀ JSON:
      {
        "evaluation": {
          "translatedUserChinese": "Câu tiếng Trung (dịch từ tiếng Việt/Anh nếu cần)",
          "userPinyin": "pinyin của translatedUserChinese",
          "userVietnamese": "nghĩa tiếng Việt của câu người dùng (dù họ nhập ngôn ngữ nào)",
          "score": number (0-100),
          "grammar": "nhận xét ngữ pháp tiếng Việt",
          "context": "nhận xét ngữ cảnh tiếng Việt",
          "vocabUsage": "nhận xét dùng từ mục tiêu",
          "suggestion": "cách nói tự nhiên hơn (tiếng Trung)",
          "suggestionPinyin": "pinyin của suggestion",
          "suggestionVietnamese": "dịch nghĩa suggestion sang tiếng Việt"
        },
        "nextMessage": {
          "chinese": "câu tiếp theo của AI",
          "pinyin": "phiên âm",
          "vietnamese": "dịch nghĩa"
        }
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        { role: 'user', parts: [{ text: prompt }] },
        ...history.map(h => ({ role: h.role, parts: [{ text: h.content }] }))
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            evaluation: {
              type: Type.OBJECT,
              properties: {
                translatedUserChinese: { type: Type.STRING },
                userPinyin: { type: Type.STRING },
                userVietnamese: { type: Type.STRING },
                score: { type: Type.NUMBER },
                grammar: { type: Type.STRING },
                context: { type: Type.STRING },
                vocabUsage: { type: Type.STRING },
                suggestion: { type: Type.STRING },
                suggestionPinyin: { type: Type.STRING },
                suggestionVietnamese: { type: Type.STRING },
              },
              required: ["translatedUserChinese", "userPinyin", "userVietnamese", "score", "grammar", "context", "vocabUsage", "suggestion", "suggestionPinyin", "suggestionVietnamese"]
            },
            nextMessage: {
              type: Type.OBJECT,
              properties: {
                chinese: { type: Type.STRING },
                pinyin: { type: Type.STRING },
                vietnamese: { type: Type.STRING },
              },
              required: ["chinese", "pinyin", "vietnamese"]
            }
          }
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Reflex Error:", error);
    return null;
  }
}

export async function generateConversation(words: string[], scenario: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Hãy tạo một đoạn hội thoại tiếng Trung ngắn (khoảng 4-6 câu) giữa hai người (A và B) trong bối cảnh "${scenario}". 
      BẮT BUỘC phải sử dụng các từ vựng sau đây trong đoạn hội thoại: ${words.join(", ")}.
      Trả về kết quả dưới dạng JSON với cấu trúc là một mảng các đối tượng, mỗi đối tượng có: "speaker" (A hoặc B), "chinese", "pinyin", và "vietnamese".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              speaker: { type: Type.STRING },
              chinese: { type: Type.STRING },
              pinyin: { type: Type.STRING },
              vietnamese: { type: Type.STRING },
            },
            required: ["speaker", "chinese", "pinyin", "vietnamese"],
          }
        },
      },
    });

    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Gemini Conversation Error:", error);
    return null;
  }
}

export async function generateConversationAudio(dialogue: any[]) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `TTS the following conversation in Chinese:
    ${dialogue.map(line => `${line.speaker}: ${line.chinese}`).join('\n')}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: 'A',
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
              },
              {
                speaker: 'B',
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
              }
            ]
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    return null;
  }
}

export async function evaluatePronunciation(audioBase64: string, targetText: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "audio/webm",
              data: audioBase64
            }
          },
          {
            text: `Bạn là một giáo viên dạy tiếng Trung bản xứ cực kỳ khắt khe, khó tính và tỉ mỉ. 
            Hãy nghe file âm thanh này và đánh giá xem người dùng có phát âm đúng văn bản này không: "${targetText}".
            
            TIÊU CHÍ CHẤM ĐIỂM CỰC KỲ NGHIÊM NGẶT:
            1. Thanh điệu (Tones): Đây là ưu tiên số 1. Chỉ cần sai một thanh điệu (ví dụ: thanh 3 đọc thành thanh 2), bạn phải đánh giá là "isMatch: false". Đừng bao giờ bỏ qua lỗi thanh điệu.
            2. Âm tiết: Các âm bật hơi (p, t, k, q, ch) và các âm lưỡi (z, c, s, r, j, x) phải chuẩn xác 100%.
            3. Tự nhiên: Nếu là câu ví dụ, người dùng phải đọc mượt mà, không được ngắc ngứ.
            
            PHẢN HỒI (JSON):
            - "isMatch": boolean (chỉ đặt true khi phát âm hoàn hảo cả về âm và thanh điệu).
            - "transcript": string (phiên âm pinyin kèm dấu của những gì bạn nghe được từ người dùng).
            - "feedback": string (Nhận xét thẳng thắn, chi tiết bằng tiếng Việt. Hãy chỉ trích nếu họ đọc sai thanh điệu và hướng dẫn họ sửa lại đúng chữ đó).
            - "score": number (0-100).`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isMatch: { type: Type.BOOLEAN },
            transcript: { type: Type.STRING },
            feedback: { type: Type.STRING },
            score: { type: Type.NUMBER }
          },
          required: ["isMatch", "transcript", "feedback", "score"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Audio Evaluation Error:", error);
    return null;
  }
}

export async function generateWordImage(character: string, meaning: string) {
  try {
    const prompt = `A cute, simple, and fun hand-drawn doodle of the concept "${meaning}" in a charming child-like drawing style. Use vibrant colors, playful sketchy lines, and a minimalist feel. Solid white background. IMPORTANT: Do NOT include any text, letters, Chinese characters, words, labels, or watermarks in the image. The image should be a pure visual representation without any writing.`;
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Gemini Image Generation Error:", error);
    return null;
  }
}
