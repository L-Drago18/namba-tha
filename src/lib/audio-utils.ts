import Meyda from 'meyda';

export interface VoiceFeatures {
  mfcc: number[];
}

export class VoiceExtractor {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyzer: any = null;
  private mfccBuffer: number[][] = [];

  async startRecording(): Promise<void> {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = this.audioContext.createMediaStreamSource(this.stream);

    this.mfccBuffer = [];
    this.analyzer = Meyda.createMeydaAnalyzer({
      audioContext: this.audioContext,
      source: source,
      bufferSize: 512,
      featureExtractors: ['mfcc'],
      callback: (features) => {
        if (features.mfcc) {
          this.mfccBuffer.push(features.mfcc);
        }
      },
    });

    this.analyzer.start();
  }

  stopRecording(): number[] {
    if (this.analyzer) this.analyzer.stop();
    if (this.stream) this.stream.getTracks().forEach(track => track.stop());
    if (this.audioContext) this.audioContext.close();

    if (this.mfccBuffer.length === 0) return [];

    // Average the MFCCs to create a "fingerprint"
    const numCoefficients = this.mfccBuffer[0].length;
    const averageMFCC = new Array(numCoefficients).fill(0);

    for (const frame of this.mfccBuffer) {
      for (let i = 0; i < numCoefficients; i++) {
        averageMFCC[i] += frame[i];
      }
    }

    return averageMFCC.map(val => val / this.mfccBuffer.length);
  }
}

export const voiceExtractor = new VoiceExtractor();
