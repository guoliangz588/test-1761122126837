# UI Tool Server

A dynamic UI component server built with Next.js that allows you to register and serve React components via API, featuring an advanced Multi-Agent System for intelligent automation.

## Features

- 🚀 **Dynamic Component Registration**: Register React/TSX components via REST API
- 📦 **Automatic Page Generation**: Components are automatically served as pages
- 🎨 **Pre-installed UI Libraries**: Comes with shadcn/ui components ready to use
- 🔥 **Hot Reload**: See your components update in real-time
- 📝 **Component Registry**: Track all registered components with metadata
- 🤖 **Multi-Agent System**: LangGraph-inspired agent orchestration for complex workflows
- 🔄 **Intelligent Routing**: Smart agent-to-agent communication with structured decisions
- 🛠️ **Dynamic UI Integration**: Automatic UI component creation and assignment to agents
- 💬 **Real-time Chat Interface**: Test multi-agent conversations with live streaming
- 📱 **Seamless UI Interactions**: Optimized message handling for UI tool user inputs

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone [your-repo-url]
cd ui-tool-server-standalone
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:4000`

## Environment Variables

To run the application, you need to set up your environment variables. Create a file named `.env.local` in the root of the project and add the following:

```
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key_here
```

Replace `your_google_api_key_here` with your actual Google Generative AI API key. This is required for the Chatbot functionality.

## Chatbot

This project includes a powerful AI chatbot that can dynamically use the registered UI components.

- **URL**: `/chat`
- **Full URL**: `http://localhost:4000/chat`

The chatbot is powered by Google's Gemini model and can understand requests to render specific UI tools. It maintains a separate chat history for each session, stored locally in your browser.

## API Usage

### UI Component Management

#### Register a UI Component

**POST** `/api/ui-register`

Register a new React component that will be served as a page.

**Request Body:**
```json
{
  "name": "My Component",
  "description": "A description of what this component does",
  "code": "export default function MyComponent() { return <div>Hello World</div>; }"
}
```

**Response:**
```json
{
  "success": true,
  "message": "UI tool 'My Component' registered successfully",
  "tool": {
    "id": "my-component",
    "name": "My Component",
    "description": "A description of what this component does",
    "filename": "my-component.tsx",
    "url": "http://localhost:4000/my-component",
    "createdAt": "2024-01-20T10:30:00.000Z"
  }
}
```

#### List All Components

**GET** `/api/ui-register`

Get a list of all registered components.

**Response:**
```json
{
  "success": true,
  "tools": [
    {
      "id": "my-component",
      "name": "My Component",
      "description": "A description of what this component does",
      "filename": "my-component.tsx",
      "url": "http://localhost:4000/my-component",
      "createdAt": "2024-01-20T10:30:00.000Z"
    }
  ],
  "count": 1
}
```

---

## Multi-Agent System API

The Multi-Agent System provides a comprehensive set of APIs for creating, managing, and interacting with intelligent agent workflows. These APIs enable external systems to integrate with the agent orchestration platform.

### Agent System Management

#### Create Agent System

**POST** `/api/agent-systems`

Create a new multi-agent system with AI-powered design. The system will automatically generate agents, connections, and UI requirements based on your description.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Customer Support System",
  "description": "A comprehensive customer service system for handling inquiries, complaints, and support tickets",
  "userPrompt": "Create an intelligent customer service system that can handle FAQ questions, process complaints, and create support tickets. The system should have a main coordinator that routes requests to specialized agents based on the type of inquiry."
}
```

**Request Parameters:**
- `name` (string, required): Display name for the agent system
- `description` (string, required): Detailed description of the system's purpose
- `userPrompt` (string, required): Natural language description of desired functionality
- `existingUITools` (array, optional): List of existing UI tool IDs to use

**Response:**
```json
{
  "success": true,
  "system": {
    "id": "system_1234567890_abc123",
    "name": "Customer Support System",
    "description": "A comprehensive customer service system...",
    "agents": [
      {
        "id": "orchestrator",
        "name": "Customer Service Coordinator",
        "type": "orchestrator",
        "description": "Routes customer inquiries to appropriate agents",
        "capabilities": ["intent_recognition", "routing"],
        "systemPrompt": "You are a customer service coordinator...",
        "toolAccess": ["dashboard-widget"]
      },
      {
        "id": "faq_assistant",
        "name": "FAQ Assistant",
        "type": "tool",
        "description": "Handles frequently asked questions",
        "capabilities": ["knowledge_retrieval", "answer_generation"],
        "systemPrompt": "You are an FAQ assistant...",
        "toolAccess": [],
        "uiRequirements": [
          {
            "toolName": "faq-search-interface",
            "description": "Search interface for FAQ database",
            "purpose": "Allow users to search and browse FAQ content",
            "priority": "high"
          }
        ]
      }
    ],
    "connections": [
      {
        "from": "orchestrator",
        "to": "faq_assistant",
        "type": "conditional",
        "condition": "user_intent == \"faq\"",
        "description": "Route FAQ questions to FAQ assistant"
      }
    ],
    "uiTools": ["dashboard-widget", "login-form"],
    "pendingUIRequirements": [
      {
        "agentId": "faq_assistant",
        "agentName": "FAQ Assistant",
        "requirement": {
          "toolName": "faq-search-interface",
          "description": "Search interface for FAQ database",
          "purpose": "Allow users to search and browse FAQ content",
          "priority": "high"
        }
      }
    ],
    "status": "pending",
    "metadata": {
      "createdAt": "2025-07-03T10:30:00.000Z",
      "createdBy": "system-designer",
      "version": "1.0.0"
    }
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Missing required fields: name, description, userPrompt"
}
```

#### List Agent Systems

**GET** `/api/agent-systems`

Retrieve all registered agent systems.

**Response:**
```json
{
  "success": true,
  "systems": [
    {
      "id": "system_1234567890_abc123",
      "name": "Customer Support System",
      "description": "A comprehensive customer service system...",
      "agents": [...],
      "connections": [...],
      "uiTools": [...],
      "pendingUIRequirements": [...],
      "status": "active",
      "metadata": {
        "createdAt": "2025-07-03T10:30:00.000Z",
        "deployedAt": "2025-07-03T10:35:00.000Z",
        "lastActive": "2025-07-03T11:00:00.000Z",
        "createdBy": "system-designer",
        "version": "1.0.0"
      }
    }
  ],
  "count": 1
}
```

#### Get Agent System Details

**GET** `/api/agent-systems/{systemId}`

Retrieve detailed information about a specific agent system.

**Path Parameters:**
- `systemId` (string, required): Unique identifier of the agent system

**Response:**
```json
{
  "success": true,
  "system": {
    "id": "system_1234567890_abc123",
    "name": "Customer Support System",
    "description": "A comprehensive customer service system...",
    "agents": [
      {
        "id": "orchestrator",
        "name": "Customer Service Coordinator",
        "type": "orchestrator",
        "description": "Routes customer inquiries to appropriate agents",
        "capabilities": ["intent_recognition", "routing"],
        "systemPrompt": "You are a customer service coordinator...",
        "toolAccess": ["dashboard-widget"],
        "routingRules": []
      }
    ],
    "connections": [
      {
        "from": "orchestrator",
        "to": "faq_assistant",
        "type": "conditional",
        "condition": "user_intent == \"faq\"",
        "description": "Route FAQ questions to FAQ assistant"
      }
    ],
    "uiTools": ["dashboard-widget", "faq-search-interface"],
    "pendingUIRequirements": [],
    "status": "active",
    "metadata": {
      "createdAt": "2025-07-03T10:30:00.000Z",
      "deployedAt": "2025-07-03T10:35:00.000Z",
      "lastActive": "2025-07-03T11:00:00.000Z",
      "createdBy": "system-designer",
      "version": "1.0.0"
    }
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "System not found"
}
```

### Agent System Deployment

#### Deploy Agent System

**POST** `/api/agent-systems/{systemId}/deploy`

Deploy an agent system, creating necessary UI components and activating the system for use.

**Path Parameters:**
- `systemId` (string, required): Unique identifier of the agent system

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "systemId": "system_1234567890_abc123",
  "autoCreateUI": true
}
```

**Request Parameters:**
- `systemId` (string, required): System ID to deploy
- `autoCreateUI` (boolean, optional, default: true): Whether to automatically create required UI components

**Response:**
```json
{
  "success": true,
  "deployment": {
    "systemId": "system_1234567890_abc123",
    "endpoint": "/api/agent-chat/system_1234567890_abc123",
    "toolsCreated": 2,
    "agentsConfigured": 3,
    "deployedAt": "2025-07-03T10:35:00.000Z",
    "status": "success",
    "logs": [
      "Starting deployment of Customer Support System",
      "Found 3 agents",
      "Found 2 UI requirements",
      "Creating UI components...",
      "Creating UI: faq-search-interface",
      "✅ Created: faq-search-interface",
      "Creating UI: ticket-form",
      "✅ Created: ticket-form",
      "Loading system to runtime engine...",
      "✅ System loaded to runtime engine",
      "✅ Deployment completed successfully"
    ]
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "System not found or deployment failed",
  "details": "Failed to create UI component: invalid-component-name"
}
```

### Agent Chat Interface

#### Chat with Agent System

**POST** `/api/agent-chat/{systemId}`

Initiate a conversation with a deployed multi-agent system. The system will intelligently route the conversation through appropriate agents based on the content and context.

**Path Parameters:**
- `systemId` (string, required): Unique identifier of the deployed agent system

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "I have a question about your return policy"
    }
  ]
}
```

**Request Parameters:**
- `messages` (array, required): Array of conversation messages
  - `role` (string, required): Message role (`"user"` or `"assistant"`)
  - `content` (string, required): Message content
  - `id` (string, optional): Message identifier
  - `createdAt` (string, optional): Message timestamp

**Response:**
The response is a streaming text response compatible with the AI SDK. The stream contains agent responses with agent identification.

**Streaming Response Format:**
```
Content-Type: text/plain; charset=utf-8
x-vercel-ai-data-stream: v1

0:"[faq_assistant] Thank you for your question about our return policy. Our standard return policy allows returns within 30 days of purchase for most items in original condition..."
d:{"finishReason":"stop","usage":{"promptTokens":150,"completionTokens":85}}
```

**Example Response (when parsed):**
```json
{
  "role": "assistant",
  "content": "[faq_assistant] Thank you for your question about our return policy. Our standard return policy allows returns within 30 days of purchase for most items in original condition...",
  "metadata": {
    "agentType": "faq_assistant",
    "agentName": "FAQ Assistant",
    "routingDecision": "END",
    "toolsUsed": ["faq-search-interface"]
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "System not found or not deployed"
}
```

### Agent System Status Codes

| Status | Description |
|--------|-------------|
| `pending` | System created but not yet deployed |
| `deploying` | System is currently being deployed |
| `active` | System is deployed and ready for use |
| `error` | System encountered an error during deployment or execution |

### Agent Types

| Type | Description | Capabilities |
|------|-------------|--------------|
| `orchestrator` | Main coordinator that routes requests to other agents | Intent recognition, routing decisions, workflow orchestration |
| `tool` | Specialized agent that performs specific tasks | Task execution, UI interaction, data processing |
| `decision` | Agent that makes complex decisions based on multiple factors | Decision making, rule evaluation, conditional logic |
| `interface` | Agent that handles external system integrations | API calls, data transformation, system integration |

### Integration Examples

#### Creating a Simple FAQ System

```bash
# 1. Create the agent system
curl -X POST http://localhost:4000/api/agent-systems \
  -H "Content-Type: application/json" \
  -d '{
    "name": "FAQ System",
    "description": "Simple FAQ handling system",
    "userPrompt": "Create a system that can answer frequently asked questions about products and services"
  }'

# 2. Deploy the system (replace with actual system ID)
curl -X POST http://localhost:4000/api/agent-systems/system_123/deploy \
  -H "Content-Type: application/json" \
  -d '{"autoCreateUI": true}'

# 3. Chat with the system
curl -X POST http://localhost:4000/api/agent-chat/system_123 \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What are your business hours?"}
    ]
  }'
```

#### External System Integration

```javascript
// Example: Integrating with the Multi-Agent System API
class AgentSystemClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async createSystem(config) {
    const response = await fetch(`${this.baseUrl}/api/agent-systems`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}` // if auth is implemented
      },
      body: JSON.stringify(config)
    });
    return response.json();
  }

  async deploySystem(systemId) {
    const response = await fetch(`${this.baseUrl}/api/agent-systems/${systemId}/deploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ autoCreateUI: true })
    });
    return response.json();
  }

  async chatWithSystem(systemId, messages) {
    const response = await fetch(`${this.baseUrl}/api/agent-chat/${systemId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ messages })
    });
    
    // Handle streaming response
    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        // Process streaming chunks
        console.log('Received chunk:', chunk);
      }
    }
  }
}

// Usage
const client = new AgentSystemClient('http://localhost:4000');

const system = await client.createSystem({
  name: "Support System",
  description: "Customer support automation",
  userPrompt: "Create a system for handling customer support tickets"
});

await client.deploySystem(system.system.id);

await client.chatWithSystem(system.system.id, [
  { role: 'user', content: 'I need help with my order' }
]);
```

### Rate Limits and Best Practices

- **Rate Limits**: No current rate limits, but recommended max 10 requests/second per system
- **Timeouts**: Chat requests timeout after 30 seconds, deployment after 60 seconds
- **Best Practices**:
  - Always check deployment status before initiating chat
  - Handle streaming responses appropriately
  - Include meaningful agent system descriptions for better AI generation
  - Test systems thoroughly before production use
  - Monitor system performance through the metadata timestamps

## Example Components

### Simple Button
```javascript
{
  "name": "Action Button",
  "description": "A simple action button",
  "code": "export default function ActionButton() {\n  return (\n    <button className='bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600'>\n      Click Me!\n    </button>\n  );\n}"
}
```

### Interactive Counter
```javascript
{
  "name": "Counter",
  "description": "An interactive counter component",
  "code": "import React from 'react';\n\nexport default function Counter() {\n  const [count, setCount] = React.useState(0);\n  \n  return (\n    <div className='p-4'>\n      <h2 className='text-2xl mb-4'>Count: {count}</h2>\n      <button \n        onClick={() => setCount(count + 1)}\n        className='bg-green-500 text-white px-4 py-2 rounded mr-2'\n      >\n        Increment\n      </button>\n      <button \n        onClick={() => setCount(count - 1)}\n        className='bg-red-500 text-white px-4 py-2 rounded'\n      >\n        Decrement\n      </button>\n    </div>\n  );\n}"
}
```

## Project Structure

```
ui-tool-server-standalone/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── ui-register/   # Component registration endpoint
│   │   ├── agent-systems/ # Multi-agent system management
│   │   │   ├── route.ts   # CRUD operations for agent systems
│   │   │   └── [id]/      # Individual system operations
│   │   │       ├── route.ts      # Get system details
│   │   │       └── deploy/       # System deployment
│   │   │           └── route.ts  # Deploy endpoint
│   │   └── agent-chat/    # Agent chat interfaces
│   │       └── [systemId]/       # Chat with specific systems
│   │           └── route.ts      # Streaming chat endpoint
│   ├── systems/           # Agent system management UI
│   │   ├── page.tsx       # List all agent systems
│   │   ├── create/        # Create new agent systems
│   │   │   └── page.tsx
│   │   └── [id]/          # Individual system pages
│   │       ├── page.tsx   # System details and management
│   │       └── chat/      # Real-time chat interface
│   │           └── page.tsx
│   ├── page.tsx           # Homepage showing registered components
│   └── layout.tsx         # Root layout
├── lib/                   # Core libraries
│   ├── agents/            # Multi-agent system engine
│   │   └── runtime-engine.ts     # Agent execution and orchestration
│   ├── types/             # TypeScript definitions
│   │   └── agent-system.ts       # Agent system type definitions
│   └── utils.ts           # Utility functions
├── components/            # Reusable components
│   └── ui/               # shadcn/ui components
├── pages/                 # Dynamic component pages (auto-generated)
├── __tests__/             # Test suites
│   ├── agent-system-integration.test.ts  # Unit integration tests
│   └── agent-system-api.test.ts         # API integration tests
├── data/                  # Data storage
│   └── agent-systems/     # Agent system configurations (auto-created)
├── run-agent-tests.sh     # Test runner script
└── public/               # Static assets
```

## Available Scripts

- `npm run dev` - Start development server on port 4000
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run Jest tests
- `./run-agent-tests.sh` - Run comprehensive agent system integration tests

## Technologies Used

- [Next.js 15.0](https://nextjs.org/) - React framework
- [React 18](https://reactjs.org/) - UI library
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [shadcn/ui](https://ui.shadcn.com/) - UI component library
- [Google Gemini 2.5 Flash](https://ai.google.dev/) - AI language model
- [AI SDK](https://sdk.vercel.ai/) - AI integration toolkit
- [Zod](https://zod.dev/) - TypeScript-first schema validation
- [Jest](https://jestjs.io/) - Testing framework

## License

MIT

## UI Tool Interaction Architecture

### Optimized Message Flow Design

The system features an optimized UI tool interaction architecture that ensures seamless message handling and consistent frontend-backend synchronization:

#### Key Principles:

1. **Message Type Separation**: 
   - UI tool messages contain user-friendly prompts (e.g., "请告诉我您最关心的三个健康目标：")
   - User messages contain only the actual user input (e.g., "减肥、运动、健康饮食")
   - No automatic prefixes or summaries are added to user inputs

2. **Frontend-First Synchronization**:
   - User form submissions immediately sync to frontend message history
   - Backend focuses on agent response processing
   - Eliminates frontend-backend message inconsistencies

3. **Natural Conversation Flow**:
   ```
   [Assistant] "Please tell me your top 3 health goals:" + UI Tool
   [User] "Weight loss, exercise, healthy diet" (immediate sync)
   [Assistant] Agent processes and responds with confirmation/next steps
   ```

#### Implementation Details:

**Backend (enhanced-runtime-engine.ts)**:
- Removed automatic user message generation from UI interactions
- Backend only handles agent response logic
- Improved debugging with detailed message flow logs

**Frontend (enhanced-chat.tsx)**:
- Immediate user message synchronization on form submission
- Clean user input extraction without added prefixes
- Real-time message history updates

**Agent System Generation (agent-systems/route.ts)**:
- Enhanced system prompts prioritize user-friendly messaging
- Agents generate natural prompts instead of technical descriptions
- Improved agent behavior for UI tool interactions

#### Benefits:

- ✅ **Consistent Message History**: Frontend and backend stay perfectly synchronized
- ✅ **Clean User Experience**: Users see their actual inputs, not generated summaries  
- ✅ **Natural Interactions**: Conversational flow feels more human and intuitive
- ✅ **Reliable Debugging**: Enhanced logging for easier troubleshooting
- ✅ **Scalable Design**: Architecture supports complex multi-step UI interactions

This architecture ensures that UI tool interactions feel natural and seamless while maintaining technical reliability and consistency.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.