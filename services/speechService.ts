
export interface SpeechRecognitionError {
  error: string;
  message: string;
}

export class SpeechService {
  private recognition: any;
  public isSupported: boolean = false;

  constructor() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'zh-CN';
      this.isSupported = true;
    }
  }

  startListening(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported) {
        reject({ error: 'not-supported', message: 'Trình duyệt của bạn không hỗ trợ nhận diện giọng nói.' });
        return;
      }

      // Đảm bảo dừng các phiên cũ trước khi bắt đầu
      try {
        this.recognition.abort();
      } catch (e) {}

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };

      this.recognition.onerror = (event: any) => {
        let errorMsg = 'Có lỗi xảy ra khi nhận diện.';
        if (event.error === 'not-allowed') errorMsg = 'Vui lòng cấp quyền sử dụng Microphone để tập đọc.';
        if (event.error === 'no-speech') errorMsg = 'Máy chưa nghe thấy bạn nói gì. Hãy thử lại nhé!';
        if (event.error === 'network') errorMsg = 'Lỗi kết nối mạng. Vui lòng kiểm tra internet.';
        
        reject({ error: event.error, message: errorMsg });
      };

      // Thêm một chút delay nhỏ để UI kịp cập nhật trạng thái "Ghi âm"
      setTimeout(() => {
        try {
          this.recognition.start();
        } catch (e) {
          reject({ error: 'already-started', message: 'Hệ thống đang bận, vui lòng thử lại sau giây lát.' });
        }
      }, 100);
    });
  }

  stopListening() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
  }
}

export const speechService = new SpeechService();
