'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Lightbulb } from 'lucide-react';
import { AgentMessage, AutoCompleteSuggestion } from '@/lib/types/medical-agent';

interface TextInputProps {
  message: AgentMessage;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  onSubmit: () => void;
  suggestions?: string[];
  disabled?: boolean;
  className?: string;
}

export function TextInput({
  message,
  value,
  onChange,
  onSubmit,
  suggestions = [],
  disabled = false,
  className = ''
}: TextInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // 处理输入变化
  const handleInputChange = useCallback((newValue: string) => {
    onChange(newValue);
    
    // 过滤建议
    if (suggestions.length > 0 && newValue.trim()) {
      const filtered = suggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(newValue.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [onChange, suggestions]);

  // 处理复选框变化
  const handleCheckboxChange = useCallback((optionValue: string, checked: boolean) => {
    const currentValues = Array.isArray(value) ? value : [];
    
    if (checked) {
      onChange([...currentValues, optionValue]);
    } else {
      onChange(currentValues.filter(v => v !== optionValue));
    }
  }, [value, onChange]);

  // 应用建议
  const applySuggestion = useCallback((suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, [onChange]);

  // 键盘事件处理
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (message.inputType !== 'multiline') {
        onSubmit();
      }
    }
    
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }, [message.inputType, onSubmit]);

  // 点击外部关闭建议
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 渲染不同类型的输入组件
  const renderInput = () => {
    switch (message.inputType) {
      case 'multiline':
        return (
          <div className="relative">
            <Textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={message.placeholder}
              disabled={disabled}
              className="min-h-[100px] resize-y"
              rows={4}
            />
            {renderSuggestions()}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-3">
            {message.options?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={option.value}
                  checked={Array.isArray(value) && value.includes(option.value)}
                  onCheckedChange={(checked) => 
                    handleCheckboxChange(option.value, checked as boolean)
                  }
                  disabled={disabled}
                />
                <Label
                  htmlFor={option.value}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        );

      case 'text':
      default:
        return (
          <div className="relative">
            <Input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={message.placeholder}
              disabled={disabled}
            />
            {renderSuggestions()}
          </div>
        );
    }
  };

  // 渲染建议列表
  const renderSuggestions = () => {
    if (!showSuggestions || filteredSuggestions.length === 0) return null;

    return (
      <Card
        ref={suggestionsRef}
        className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto"
      >
        <div className="p-2">
          <div className="flex items-center space-x-1 mb-2 text-xs text-muted-foreground">
            <Lightbulb className="h-3 w-3" />
            <span>Suggestions</span>
          </div>
          <div className="space-y-1">
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => applySuggestion(suggestion)}
                className="w-full text-left p-2 text-sm rounded hover:bg-muted transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </Card>
    );
  };

  // 渲染已选择的值（用于复选框）
  const renderSelectedValues = () => {
    if (message.inputType !== 'checkbox' || !Array.isArray(value) || value.length === 0) {
      return null;
    }

    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {value.map((selectedValue) => {
          const option = message.options?.find(opt => opt.value === selectedValue);
          return (
            <Badge key={selectedValue} variant="secondary" className="flex items-center gap-1">
              {option?.label || selectedValue}
              <button
                onClick={() => handleCheckboxChange(selectedValue, false)}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          );
        })}
      </div>
    );
  };

  // 检查是否有有效输入
  const hasValidInput = () => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return typeof value === 'string' && value.trim().length > 0;
  };

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        {/* 问题文本 */}
        <div className="space-y-2">
          <h3 className="font-medium text-foreground">{message.text}</h3>
          {message.placeholder && message.inputType !== 'checkbox' && (
            <p className="text-sm text-muted-foreground">
              Example: {message.placeholder}
            </p>
          )}
        </div>

        {/* 输入组件 */}
        <div className="space-y-2">
          {renderInput()}
          {renderSelectedValues()}
        </div>

        {/* 快速建议按钮 */}
        {suggestions.length > 0 && message.inputType !== 'checkbox' && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Quick suggestions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.slice(0, 3).map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => applySuggestion(suggestion)}
                  disabled={disabled}
                  className="text-xs"
                >
                  {suggestion.length > 30 ? `${suggestion.substring(0, 30)}...` : suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* 提交按钮 */}
        <div className="flex justify-between items-center">
          <div className="text-xs text-muted-foreground">
            {message.inputType === 'multiline' && 'Press Ctrl+Enter to submit'}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onChange(Array.isArray(value) ? [] : '')}
              disabled={disabled || !hasValidInput()}
            >
              Clear
            </Button>
            <Button
              onClick={onSubmit}
              disabled={disabled || !hasValidInput()}
              size="sm"
            >
              Submit
            </Button>
          </div>
        </div>

        {/* 字符计数（仅文本输入） */}
        {(message.inputType === 'text' || message.inputType === 'multiline') && 
         typeof value === 'string' && value.length > 0 && (
          <div className="text-xs text-muted-foreground text-right">
            {value.length} characters
          </div>
        )}
      </div>
    </Card>
  );
}
