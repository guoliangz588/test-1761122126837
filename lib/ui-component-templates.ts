/**
 * UI组件模板库
 * 提供静态和交互式组件的标准模板
 */

export interface UIComponentProps {
  sessionId?: string
  agentId?: string
  onInteraction?: (event: any) => void
  [key: string]: any
}

export interface InteractiveUIConfig {
  fields: {
    name: string
    type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'number' | 'date'
    label: string
    placeholder?: string
    required?: boolean
    options?: string[] // for select, radio
    validation?: string // regex pattern
  }[]
  submitButton?: {
    text: string
    variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link'
  }
  onSubmitMessage?: string // message to send to agent on submit
}

/**
 * 生成静态展示组件模板
 */
export function generateStaticTemplate(componentName: string, description: string, jsx: string): string {
  return `/*
 * ${description}
 * Generated Static UI Tool Component
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ${componentName}Props {
  sessionId?: string;
  agentId?: string;
  onInteraction?: (event: any) => void;
  [key: string]: any;
}

export default function ${componentName}({ sessionId, agentId, onInteraction, ...props }: ${componentName}Props) {
${jsx}
}
`;
}

/**
 * 生成交互式组件模板
 */
export function generateInteractiveTemplate(
  componentName: string, 
  description: string, 
  config: InteractiveUIConfig
): string {
  const fieldsCode = config.fields.map(field => {
    switch (field.type) {
      case 'textarea':
        return `      <div className="mb-4">
        <Label htmlFor="${field.name}" className="text-sm font-medium">${field.label}</Label>
        <Textarea
          id="${field.name}"
          name="${field.name}"
          placeholder="${field.placeholder || ''}"
          value={formData.${field.name} || ''}
          onChange={handleInputChange}
          className="min-h-[100px] resize-y"
          ${field.required ? 'required' : ''}
        />
      </div>`;
      case 'select':
        return `      <div className="mb-4">
        <Label htmlFor="${field.name}" className="text-sm font-medium">${field.label}</Label>
        <Select
          name="${field.name}"
          value={formData.${field.name} || ''}
          onValueChange={(value) => setFormData(prev => ({ ...prev, ${field.name}: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="${field.placeholder || 'Select...'}" />
          </SelectTrigger>
          <SelectContent>
            ${field.options?.map(option => `<SelectItem value="${option}">${option}</SelectItem>`).join('\n            ') || ''}
          </SelectContent>
        </Select>
      </div>`;
      default: // text, number, date
        return `      <div className="mb-4">
        <Label htmlFor="${field.name}" className="text-sm font-medium">${field.label}</Label>
        <Input
          id="${field.name}"
          name="${field.name}"
          type="${field.type}"
          placeholder="${field.placeholder || ''}"
          value={formData.${field.name} || ''}
          onChange={handleInputChange}
          ${field.required ? 'required' : ''}
        />
      </div>`;
    }
  }).join('\n\n');

  const formDataFields = config.fields.map(field => `${field.name}: ''`).join(',\n    ');

  return `/*
 * ${description}
 * Generated Interactive UI Tool Component
 */

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ${componentName}Props {
  sessionId?: string;
  agentId?: string;
  onInteraction?: (event: any) => void;
  [key: string]: any;
}

export default function ${componentName}({ sessionId, agentId, onInteraction, ...props }: ${componentName}Props) {
  const [formData, setFormData] = useState({
    ${formDataFields}
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 发送数据到Agent
      if (onInteraction) {
        await onInteraction({
          eventType: 'form_submit',
          formData: formData,
          message: '${config.onSubmitMessage || 'User has submitted form data'}',
          timestamp: new Date().toISOString(),
          componentName: '${componentName}',
          agentId: agentId || 'main-orchestrator' // 确保传递agentId
        });
      }

      setIsSubmitted(true);
    } catch (error) {
      console.error('Failed to submit form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="p-6 max-w-lg mx-auto shadow-md">
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">
            ✅ Information submitted successfully! The agent is processing your input.
          </AlertDescription>
        </Alert>
      </Card>
    );
  }

  return (
    <Card className="p-6 max-w-lg mx-auto shadow-md">
      <form onSubmit={handleSubmit} className="space-y-4">
${fieldsCode}

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isSubmitting}
          variant="${config.submitButton?.variant || 'default'}"
        >
          {isSubmitting ? 'Submitting...' : '${config.submitButton?.text || 'Submit'}'}
        </Button>
      </form>
    </Card>
  );
}
`;
}

/**
 * 生成混合组件模板（包含静态内容和交互功能）
 */
export function generateHybridTemplate(
  componentName: string,
  description: string,
  staticJSX: string,
  interactiveConfig: InteractiveUIConfig
): string {
  const interactiveTemplate = generateInteractiveTemplate(componentName + 'Interactive', '', interactiveConfig);
  
  return `/*
 * ${description}
 * Generated Hybrid UI Tool Component (Static + Interactive)
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ${componentName}Props {
  sessionId?: string;
  agentId?: string;
  onInteraction?: (event: any) => void;
  [key: string]: any;
}

${interactiveTemplate.replace(`export default function ${componentName}Interactive`, `function ${componentName}Interactive`)}

export default function ${componentName}({ sessionId, agentId, onInteraction, ...props }: ${componentName}Props) {
  const [showInteractive, setShowInteractive] = useState(false);

  if (showInteractive) {
    return (
      <div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowInteractive(false)}
          className="mb-4"
        >
          ← Back to Information
        </Button>
        <${componentName}Interactive
          sessionId={sessionId}
          agentId={agentId}
          onInteraction={onInteraction}
          {...props}
        />
      </div>
    );
  }

  return (
    <div>
${staticJSX}
      
      <div className="mt-4 text-center">
        <Button onClick={() => setShowInteractive(true)}>
          Interact with this tool
        </Button>
      </div>
    </div>
  );
}
`;
}