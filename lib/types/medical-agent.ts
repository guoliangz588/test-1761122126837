// Medical Agent Types

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  agentType?: string
  inputType?: 'multiline' | 'singleline' | 'checkbox' | 'radio' | 'select' | 'text'
  placeholder?: string
  text?: string
  options?: Array<{
    value: string
    label: string
    checked?: boolean
  }>
  // 消息去重相关字段
  savedToDb?: boolean  // 是否已保存到数据库
  needsSaving?: boolean  // 是否需要保存到数据库
  metadata?: Record<string, any>  // 额外的元数据
}

export interface VoiceInputState {
  isListening?: boolean
  isRecording?: boolean
  audioLevel?: number
  transcript: string
  isProcessing: boolean
  confidence?: number
  error?: string
}

export type InputMode = 'text' | 'voice' | 'mixed'

export const InputMode = {
  TEXT: 'text' as const,
  VOICE: 'voice' as const,
  MIXED: 'mixed' as const
}

export interface MedicalAgentResponse {
  response: string
  confidence?: number
  nextSteps?: string[]
  recommendations?: string[]
}

export interface PatientInfo {
  id: string
  name: string
  age?: number
  symptoms?: string[]
  medicalHistory?: string[]
}

export interface AutoCompleteSuggestion {
  id: string
  text: string
  category?: string
  confidence?: number
}

export interface SpeechConfig {
  language?: string
  continuous?: boolean
  interimResults?: boolean
  maxAlternatives?: number
}

// Browser API type declarations
declare global {
  interface SpeechRecognition extends EventTarget {
    continuous: boolean
    interimResults: boolean
    lang: string
    maxAlternatives: number
    start(): void
    stop(): void
    abort(): void
    onerror: ((event: any) => void) | null
    onresult: ((event: any) => void) | null
    onstart: ((event: any) => void) | null
    onend: ((event: any) => void) | null
  }
  
  interface SpeechRecognitionConstructor {
    new(): SpeechRecognition
  }
  
  var SpeechRecognition: SpeechRecognitionConstructor
  var webkitSpeechRecognition: SpeechRecognitionConstructor
}