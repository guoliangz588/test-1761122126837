"use client";

import { ToolInvocation } from 'ai';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { BotIcon, UserIcon } from './icons';
import { Markdown } from './markdown';

// 动态 UI 工具渲染器
const DynamicUITool = ({ toolInvocation }: { toolInvocation: ToolInvocation }) => {
  const { toolName, state } = toolInvocation;

  if (state === 'result' && 'result' in toolInvocation) {
    const {
      toolId,
      toolName: actualToolName,
      url,
      props,
    } = toolInvocation.result as any;

    // Append props to URL as query parameters for the iframe
    const srcUrl = new URL(url);
    if (props) {
        Object.entries(props).forEach(([key, value]) => {
            srcUrl.searchParams.append(key, String(value));
        });
    }

    return (
      <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            UI Tool: {actualToolName}
          </span>
        </div>

        <div className="border rounded-md overflow-hidden bg-white">
          <iframe
            src={srcUrl.toString()}
            className="w-full h-96"
            title={`${actualToolName} UI Tool`}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    );
  }

  // Loading state
  return (
    <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full animate-ping"></div>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Loading UI Tool...
        </span>
      </div>
      <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
    </div>
  );
};

export const DynamicMessage = ({
  role,
  content,
  toolInvocations,
}: {
  role: 'user' | 'assistant';
  content: string;
  toolInvocations?: Array<ToolInvocation>;
}) => {
  return (
    <motion.div
      className="flex flex-row gap-4 w-full"
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-8 h-8 border rounded-full p-1.5 flex justify-center items-center shrink-0 text-gray-500 bg-white dark:bg-gray-800">
        {role === 'assistant' ? <BotIcon /> : <UserIcon />}
      </div>

      <div className="flex flex-col gap-3 w-full">
        {content && (
          <div className="text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-900 rounded-lg p-3">
            <Markdown>{content}</Markdown>
          </div>
        )}

        {toolInvocations && (
          <div className="flex flex-col gap-4">
            {toolInvocations.map(toolInvocation => {
              const { toolName } = toolInvocation;
              if (toolName.startsWith('render')) {
                return (
                  <DynamicUITool
                    key={toolInvocation.toolCallId}
                    toolInvocation={toolInvocation}
                  />
                );
              }
              const resultText = 'result' in toolInvocation ? JSON.stringify(toolInvocation.result, null, 2) : 'No result';
              return (
                <div
                  key={toolInvocation.toolCallId}
                  className="text-xs text-gray-500"
                >
                  Tool Call: {toolName} - Result:{' '}
                  <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-wrap">
                    {resultText}
                  </pre>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}; 