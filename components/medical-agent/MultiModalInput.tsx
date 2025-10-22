'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Mic, Type, RotateCcw, Volume2 } from 'lucide-react';
import { VoiceInput } from './VoiceInput';
import { TextInput } from './TextInput';
import { AgentMessage, VoiceInputState, InputMode } from '@/lib/types/medical-agent';

interface MultiModalInputProps {
  message: AgentMessage;
  value: string | string[];
  onChange: (value: string | string[], inputMethod: 'text' | 'voice') => void;
  onSubmit: (inputMethod: 'text' | 'voice') => void;
  suggestions?: string[];
  disabled?: boolean;
  defaultMode?: InputMode;
  className?: string;
}

export function MultiModalInput({
  message,
  value,
  onChange,
  onSubmit,
  suggestions = [],
  disabled = false,
  defaultMode = InputMode.TEXT,
  className = ''
}: MultiModalInputProps) {
  const [currentMode, setCurrentMode] = useState<InputMode>(defaultMode);
  const [voiceState, setVoiceState] = useState<VoiceInputState>({
    isListening: false,
    isProcessing: false,
    transcript: '',
    confidence: 0
  });
  const [lastInputMethod, setLastInputMethod] = useState<'text' | 'voice'>('text');

  // 处理语音转录
  const handleVoiceTranscript = useCallback((transcript: string, _confidence: number) => {
    if (transcript.trim()) {
      onChange(transcript, 'voice');
      setLastInputMethod('voice');
    }
  }, [onChange]);

  // 处理文本输入变化
  const handleTextChange = useCallback((newValue: string | string[]) => {
    onChange(newValue, 'text');
    setLastInputMethod('text');
  }, [onChange]);

  // 处理语音状态变化
  const handleVoiceStateChange = useCallback((state: VoiceInputState) => {
    setVoiceState(state);
    
    // 如果开始语音输入，自动切换到语音模式
    if (state.isListening && currentMode !== InputMode.VOICE) {
      setCurrentMode(InputMode.VOICE);
    }
  }, [currentMode]);

  // 处理提交
  const handleSubmit = useCallback(() => {
    onSubmit(lastInputMethod);
  }, [onSubmit, lastInputMethod]);

  // 切换输入模式
  const switchMode = useCallback((mode: InputMode) => {
    setCurrentMode(mode);
    
    // 如果切换到文本模式且正在语音输入，停止语音
    if (mode === InputMode.TEXT && voiceState.isListening) {
      // 这里可以添加停止语音输入的逻辑
    }
  }, [voiceState.isListening]);

  // 清除输入
  const clearInput = useCallback(() => {
    onChange(Array.isArray(value) ? [] : '', lastInputMethod);
  }, [onChange, value, lastInputMethod]);

  // 重新开始语音输入
  const restartVoice = useCallback(() => {
    clearInput();
    setCurrentMode(InputMode.VOICE);
  }, [clearInput]);

  // 检查是否有有效输入
  const hasValidInput = () => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return typeof value === 'string' && value.trim().length > 0;
  };

  // 获取输入方法指示器
  const getInputMethodBadge = () => {
    if (!hasValidInput()) return null;

    return (
      <Badge variant={lastInputMethod === 'voice' ? 'default' : 'secondary'} className="text-xs">
        {lastInputMethod === 'voice' ? (
          <>
            <Mic className="h-3 w-3 mr-1" />
            Voice
          </>
        ) : (
          <>
            <Type className="h-3 w-3 mr-1" />
            Text
          </>
        )}
      </Badge>
    );
  };

  // 语音置信度指示器
  const getConfidenceIndicator = () => {
    if (lastInputMethod !== 'voice' || !voiceState.confidence || voiceState.confidence === 0) return null;

    const confidenceLevel = voiceState.confidence * 100;
    const getConfidenceColor = () => {
      if (confidenceLevel >= 80) return 'text-green-600';
      if (confidenceLevel >= 60) return 'text-yellow-600';
      return 'text-red-600';
    };

    return (
      <div className="flex items-center space-x-1 text-xs">
        <Volume2 className="h-3 w-3" />
        <span className={getConfidenceColor()}>
          {Math.round(confidenceLevel)}% confidence
        </span>
      </div>
    );
  };

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        {/* 模式切换和状态指示器 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getInputMethodBadge()}
            {getConfidenceIndicator()}
          </div>
          
          <div className="flex items-center space-x-2">
            {hasValidInput() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearInput}
                disabled={disabled}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* 输入模式选择 */}
        <Tabs value={currentMode} onValueChange={(value) => switchMode(value as InputMode)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value={InputMode.TEXT} className="flex items-center space-x-1">
              <Type className="h-4 w-4" />
              <span>Text</span>
            </TabsTrigger>
            <TabsTrigger value={InputMode.VOICE} className="flex items-center space-x-1">
              <Mic className="h-4 w-4" />
              <span>Voice</span>
            </TabsTrigger>
          </TabsList>

          {/* 文本输入 */}
          <TabsContent value={InputMode.TEXT} className="mt-4">
            <TextInput
              message={message}
              value={value}
              onChange={handleTextChange}
              onSubmit={handleSubmit}
              suggestions={suggestions}
              disabled={disabled || voiceState.isListening}
            />
          </TabsContent>

          {/* 语音输入 */}
          <TabsContent value={InputMode.VOICE} className="mt-4">
            <div className="space-y-4">
              <VoiceInput
                onTranscript={handleVoiceTranscript}
                onStateChange={handleVoiceStateChange}
                disabled={disabled}
              />
              
              {/* 语音转录结果显示 */}
              {voiceState.transcript && (
                <Card className="p-3 bg-muted">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Transcribed:</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={restartVoice}
                        disabled={disabled}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Retry
                      </Button>
                    </div>
                    <p className="text-sm">{voiceState.transcript}</p>
                  </div>
                </Card>
              )}

              {/* 语音输入提交按钮 */}
              {hasValidInput() && (
                <div className="flex justify-end">
                  <Button
                    onClick={handleSubmit}
                    disabled={disabled || voiceState.isListening}
                  >
                    Submit Voice Response
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* 混合模式提示 */}
        {currentMode === InputMode.MIXED && (
          <div className="text-xs text-muted-foreground text-center p-2 bg-muted rounded">
            You can switch between text and voice input at any time. 
            Your response will be recorded with the method you used last.
          </div>
        )}

        {/* 语音状态指示器 */}
        {voiceState.isListening && (
          <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span>Listening for your response...</span>
          </div>
        )}

        {voiceState.isProcessing && (
          <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span>Processing speech...</span>
          </div>
        )}

        {voiceState.error && (
          <div className="text-sm text-destructive text-center p-2 bg-destructive/10 rounded">
            {voiceState.error}
          </div>
        )}
      </div>
    </Card>
  );
}
