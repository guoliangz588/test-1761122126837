import React from 'react';
import ReactMarkdown, { Options } from 'react-markdown';
import { cn } from '@/lib/utils';

interface MarkdownProps extends Options {
    className?: string;
}

export function Markdown({
  className,
  ...props
}: MarkdownProps) {
  return (
    <div className={cn('prose prose-sm dark:prose-invert break-words', className)}>
      <ReactMarkdown
        components={{
          p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
        }}
        {...props}
      />
    </div>
  );
} 