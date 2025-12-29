
export const speak = (text: string, lang: 'zh-CN' | 'vi-VN' = 'zh-CN') => {
  if (!text) return;

  // Sử dụng Google Translate TTS API (client=tw-ob là phiên bản ổn định cho trình duyệt)
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;
  
  const audio = new Audio(url);
  audio.play().catch(err => {
    console.error("Lỗi phát âm:", err);
    // Fallback sang SpeechSynthesis nếu link Google bị chặn
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  });
};
