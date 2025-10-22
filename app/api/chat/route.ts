import { convertToCoreMessages, Message, streamText } from 'ai';
import { z } from 'zod';
import { google } from '@ai-sdk/google';
import { initializeGlobalProxy } from '@/lib/global-proxy';

// 动态获取 UI 工具列表
async function getUITools() {
  try {
    // We construct the URL carefully to work in both server-side and client-side environments.
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:4000';
    const response = await fetch(`${baseUrl}/api/ui-register`);
    if (!response.ok) {
        console.error(`Failed to fetch UI tools: ${response.statusText}`);
        return [];
    }
    const data = await response.json();
    return data.tools || [];
  } catch (error) {
    console.error('Failed to fetch UI tools:', error);
    return [];
  }
}

// 动态生成工具定义
function generateToolDefinition(tool: any) {
  return {
    description: tool.description || `A UI tool called ${tool.name}`,
    parameters: z.object({
      props: z
        .record(z.any())
        .optional()
        .describe('Props to pass to the UI component'),
    }),
    execute: async ({ props }: { props?: Record<string, any> }) => {
      // The backend simply returns the necessary info for the frontend to render the tool.
      return {
        toolId: tool.id,
        toolName: tool.name,
        description: tool.description,
        url: tool.url,
        props,
        timestamp: new Date().toISOString(),
      };
    },
  };
}

export async function POST(request: Request) {
  const {
    messages,
  }: {
    messages: Message[];
  } = await request.json();

  const uiTools = await getUITools();

  const dynamicTools: Record<string, any> = {};
  if (uiTools && Array.isArray(uiTools)) {
    uiTools.forEach((tool: any) => {
      // Sanitize the tool name to be a valid JavaScript function name
      const functionName = `render${tool.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
      dynamicTools[functionName] = generateToolDefinition(tool);
    });
  }

  const coreMessages = convertToCoreMessages(messages);

  // 初始化全局代理配置
  initializeGlobalProxy();

  const result = await streamText({
    model: google('gemini-2.5-flash'),
    system: `You are a helpful AI assistant that can render UI tools for the user.
These tools are React components built with shadcn/ui.
When a user asks to see or use a UI tool, use the appropriate 'render' function to display it.
Always explain what you're showing to the user before rendering the tool.

The following tools are available:
${uiTools.map((t: any) => `- ${t.name}: ${t.description}`).join('\n')}

Keep responses conversational and helpful. Remember the context of your previous conversation with this user.`,
    messages: coreMessages,
    tools: dynamicTools,
  });

  return result.toDataStreamResponse();
} 