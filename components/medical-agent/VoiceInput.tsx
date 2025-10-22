'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Volume2, Loader2 } from 'lucide-react';
import { VoiceInputState, SpeechConfig } from '@/lib/types/medical-agent';

interface VoiceInputProps {
  onTranscript: (transcript: string, confidence: number) => void;
  onStateChange: (state: VoiceInputState) => void;
  config?: Partial<SpeechConfig>;
  disabled?: boolean;
  className?: string;
}

export function VoiceInput({
  onTranscript,
  onStateChange,
  config = {},
  disabled = false,
  className = ''
}: VoiceInputProps) {
  const [voiceState, setVoiceState] = useState<VoiceInputState>({
    isListening: false,
    isProcessing: false,
    transcript: '',
    confidence: 0
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const speechConfig: SpeechConfig = {
    language: 'en-US',
    continuous: true,
    interimResults: true,
    maxAlternatives: 1,
    ...config
  };

  // 初始化语音识别
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 检查浏览器支持
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setVoiceState(prev => ({
        ...prev,
        error: 'Speech recognition not supported in this browser'
      }));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = speechConfig.continuous;
    recognition.interimResults = speechConfig.interimResults;
    recognition.lang = speechConfig.language;
    recognition.maxAlternatives = speechConfig.maxAlternatives;

    recognition.onstart = () => {
      setVoiceState(prev => ({
        ...prev,
        isListening: true,
        isProcessing: false,
        error: undefined
      }));
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      let maxConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence || 0;

        if (result.isFinal) {
          finalTranscript += transcript;
          maxConfidence = Math.max(maxConfidence, confidence);
        } else {
          interimTranscript += transcript;
        }
      }

      const currentTranscript = finalTranscript || interimTranscript;
      const currentConfidence = finalTranscript ? maxConfidence : 0;

      setVoiceState(prev => ({
        ...prev,
        transcript: currentTranscript,
        confidence: currentConfidence,
        isProcessing: !finalTranscript && currentTranscript.length > 0
      }));

      if (finalTranscript) {
        onTranscript(finalTranscript, maxConfidence);
        
        // 自动停止监听（可配置）
        if (!speechConfig.continuous) {
          stopListening();
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setVoiceState(prev => ({
        ...prev,
        isListening: false,
        isProcessing: false,
        error: `Speech recognition error: ${event.error}`
      }));
    };

    recognition.onend = () => {
      setVoiceState(prev => ({
        ...prev,
        isListening: false,
        isProcessing: false
      }));
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [speechConfig, onTranscript]);

  // 状态变化通知
  useEffect(() => {
    onStateChange(voiceState);
  }, [voiceState, onStateChange]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || voiceState.isListening || disabled) return;

    try {
      recognitionRef.current.start();
      
      // 设置超时自动停止
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        stopListening();
      }, 30000); // 30秒超时
      
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setVoiceState(prev => ({
        ...prev,
        error: 'Failed to start speech recognition'
      }));
    }
  }, [voiceState.isListening, disabled]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !voiceState.isListening) return;

    try {
      recognitionRef.current.stop();
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  }, [voiceState.isListening]);

  const toggleListening = useCallback(() => {
    if (voiceState.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [voiceState.isListening, startListening, stopListening]);

  // 播放音频反馈
  const playFeedbackSound = useCallback((type: 'start' | 'stop' | 'error') => {
    if (typeof window === 'undefined') return;

    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // 不同类型的音频反馈
    switch (type) {
      case 'start':
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        break;
      case 'stop':
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        break;
      case 'error':
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        break;
    }

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  }, []);

  // 音频反馈效果
  useEffect(() => {
    if (voiceState.isListening) {
      playFeedbackSound('start');
    } else if (voiceState.error) {
      playFeedbackSound('error');
    }
  }, [voiceState.isListening, voiceState.error, playFeedbackSound]);

  const getButtonVariant = () => {
    if (voiceState.error) return 'destructive';
    if (voiceState.isListening) return 'default';
    return 'outline';
  };

  const getButtonIcon = () => {
    if (voiceState.isProcessing) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (voiceState.isListening) return <MicOff className="h-4 w-4" />;
    return <Mic className="h-4 w-4" />;
  };

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex flex-col space-y-4">
        {/* 语音控制按钮 */}
        <div className="flex items-center justify-center">
          <Button
            variant={getButtonVariant()}
            size="lg"
            onClick={toggleListening}
            disabled={disabled || !!voiceState.error}
            className={`relative ${voiceState.isListening ? 'animate-pulse' : ''}`}
          >
            {getButtonIcon()}
            <span className="ml-2">
              {voiceState.isListening ? 'Stop Listening' : 'Start Voice Input'}
            </span>
          </Button>
        </div>

        {/* 实时转录显示 */}
        {voiceState.transcript && (
          <div className="bg-muted p-3 rounded-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Transcript:</span>
              {voiceState.confidence && voiceState.confidence > 0 && (
                <span className="text-xs text-muted-foreground">
                  Confidence: {Math.round(voiceState.confidence * 100)}%
                </span>
              )}
            </div>
            <p className="text-sm">{voiceState.transcript}</p>
          </div>
        )}

        {/* 状态指示器 */}
        <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
          {voiceState.isListening && (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span>Listening...</span>
            </>
          )}
          {voiceState.isProcessing && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Processing...</span>
            </>
          )}
          {voiceState.error && (
            <span className="text-destructive">{voiceState.error}</span>
          )}
        </div>

        {/* 音频可视化（简单版本） */}
        {voiceState.isListening && (
          <div className="flex items-center justify-center space-x-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-primary rounded-full animate-pulse"
                style={{
                  height: `${Math.random() * 20 + 10}px`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
