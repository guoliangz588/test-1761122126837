import fs from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { 
  generateStaticTemplate, 
  generateInteractiveTemplate, 
  generateHybridTemplate,
  InteractiveUIConfig 
} from '@/lib/ui-component-templates';

interface EnhancedUIToolData {
  name: string;
  description: string;
  type: 'static' | 'interactive' | 'hybrid';
  // For static components
  jsx?: string;
  // For interactive components
  interactiveConfig?: InteractiveUIConfig;
  // For hybrid components
  staticJSX?: string;
}

export async function POST(request: NextRequest) {
  try {
    const data: EnhancedUIToolData = await request.json();
    
    if (!data.name || !data.description || !data.type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description, type' },
        { status: 400 }
      );
    }

    // Validate type-specific requirements
    if (data.type === 'static' && !data.jsx) {
      return NextResponse.json(
        { error: 'Static components require jsx field' },
        { status: 400 }
      );
    }

    if (data.type === 'interactive' && !data.interactiveConfig) {
      return NextResponse.json(
        { error: 'Interactive components require interactiveConfig field' },
        { status: 400 }
      );
    }

    if (data.type === 'hybrid' && (!data.staticJSX || !data.interactiveConfig)) {
      return NextResponse.json(
        { error: 'Hybrid components require both staticJSX and interactiveConfig fields' },
        { status: 400 }
      );
    }

    // Sanitize the filename
    const safeName = data.name.toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Generate component name (PascalCase)
    const componentName = safeName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');

    let tsxContent: string;

    // Generate appropriate template based on type
    switch (data.type) {
      case 'static':
        tsxContent = generateStaticTemplate(componentName, data.description, data.jsx!);
        break;
      case 'interactive':
        tsxContent = generateInteractiveTemplate(componentName, data.description, data.interactiveConfig!);
        break;
      case 'hybrid':
        tsxContent = generateHybridTemplate(componentName, data.description, data.staticJSX!, data.interactiveConfig!);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid component type' },
          { status: 400 }
        );
    }

    // Define the file path in pages directory
    const pagesDir = path.join(process.cwd(), 'pages');
    const filePath = path.join(pagesDir, `${safeName}.tsx`);

    // Ensure pages directory exists
    try {
      await fs.access(pagesDir);
    } catch {
      await fs.mkdir(pagesDir, { recursive: true });
    }

    // Write the file
    await fs.writeFile(filePath, tsxContent, 'utf-8');

    return NextResponse.json({
      success: true,
      message: `Enhanced UI tool '${data.name}' registered successfully`,
      tool: {
        id: safeName,
        name: data.name,
        description: data.description,
        type: data.type,
        filename: `${safeName}.tsx`,
        url: `http://localhost:4000/${safeName}`,
        createdAt: new Date().toISOString(),
        hasInteraction: data.type === 'interactive' || data.type === 'hybrid'
      }
    });

  } catch (error) {
    console.error('Error registering enhanced UI tool:', error);
    return NextResponse.json(
      { error: 'Failed to register enhanced UI tool' },
      { status: 500 }
    );
  }
}

// GET method to provide template examples and documentation
export async function GET() {
  const examples = {
    static: {
      name: "Simple Display Card",
      description: "A card that displays information without interaction",
      type: "static",
      jsx: `  return (
    <Card className="p-6 max-w-lg mx-auto shadow-md">
      <CardHeader>
        <CardTitle>Information Display</CardTitle>
      </CardHeader>
      <CardContent>
        <p>This is a static information display.</p>
      </CardContent>
    </Card>
  );`
    },
    interactive: {
      name: "Health Goal Input",
      description: "Interactive form for collecting health goals",
      type: "interactive",
      interactiveConfig: {
        fields: [
          {
            name: "healthGoals",
            type: "textarea",
            label: "What are your top 3 health goals?",
            placeholder: "例如：减轻腹胀、改善睡眠、提高注意力",
            required: true
          },
          {
            name: "priority",
            type: "select",
            label: "Which is most important?",
            options: ["Goal 1", "Goal 2", "Goal 3"],
            required: true
          }
        ],
        submitButton: {
          text: "Submit Goals",
          variant: "default"
        },
        onSubmitMessage: "User has provided their health goals"
      }
    },
    hybrid: {
      name: "Info and Form Combo",
      description: "Shows information first, then allows interaction",
      type: "hybrid",
      staticJSX: `      <Card className="p-6 max-w-lg mx-auto shadow-md">
        <h2 className="text-xl font-bold mb-4">Health Assessment</h2>
        <p>Before we begin, please review this important information...</p>
      </Card>`,
      interactiveConfig: {
        fields: [
          {
            name: "confirmation",
            type: "checkbox",
            label: "I have read and understood the information",
            required: true
          }
        ],
        submitButton: {
          text: "Continue",
          variant: "default"
        }
      }
    }
  };

  return NextResponse.json({
    success: true,
    message: "Enhanced UI tool registration API",
    supportedTypes: ["static", "interactive", "hybrid"],
    examples: examples,
    documentation: {
      static: "Use for display-only components that don't need user interaction",
      interactive: "Use for forms and interactive components that collect user input",
      hybrid: "Use for components that show information first, then allow interaction"
    }
  });
}