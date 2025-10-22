import { GET, POST } from '@/app/api/ui-register/route';
import { NextRequest } from 'next/server';
import mock from 'mock-fs';
import fs from 'fs/promises';
import path from 'path';

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({
      json: () => Promise.resolve(data),
      status: options?.status || 200,
    })),
  },
  NextRequest: jest.requireActual('next/server').NextRequest,
}));

// Mock NextRequest
class MockNextRequest {
  private body: any;

  constructor(body: any) {
    this.body = body;
  }

  async json() {
    return this.body;
  }
}

describe('UI Tool Registration API', () => {
  const pagesDir = path.join(process.cwd(), 'pages');

  beforeEach(() => {
    // Set up a mock file system before each test
    mock({
      'pages': {}, // Ensure the pages directory exists
    });
  });

  afterEach(() => {
    // Restore the real file system after each test
    mock.restore();
  });

  describe('POST /api/ui-register', () => {
    it('should create a new UI tool file with a description comment', async () => {
      const toolData = {
        name: 'My Test Tool',
        description: 'This is a test description.',
        code: 'const MyComponent = () => <div>Test</div>;',
      };

      const request = new MockNextRequest(toolData) as unknown as NextRequest;
      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.success).toBe(true);
      expect(responseBody.tool.id).toBe('my-test-tool');

      const filePath = path.join(pagesDir, 'my-test-tool.tsx');
      const fileContent = await fs.readFile(filePath, 'utf-8');

      expect(fileContent).toContain('/*\n * This is a test description.');
      expect(fileContent).toContain(toolData.code);
    });

    it('should return 400 for missing fields', async () => {
      const request = new MockNextRequest({ name: 'Incomplete' }) as unknown as NextRequest;
      const response = await POST(request);
      const responseBody = await response.json();
      
      expect(response.status).toBe(400);
      expect(responseBody.error).toContain('Missing required fields');
    });
  });

  describe('GET /api/ui-register', () => {
    it('should return an empty list when no tools are registered', async () => {
      const response = await GET();
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.success).toBe(true);
      expect(responseBody.tools).toEqual([]);
      expect(responseBody.count).toBe(0);
    });

    it('should list all registered UI tools from the pages directory', async () => {
      // Setup: Create some mock tool files
      await fs.writeFile(
        path.join(pagesDir, 'tool-one.tsx'),
        `/*\n * Description for tool one.\n */\n// code...`
      );
      await fs.writeFile(
        path.join(pagesDir, 'tool-two.tsx'),
        `/*\n * Description for tool two.\n */\n// code...`
      );
      await fs.writeFile(
        path.join(pagesDir, 'not-a-tool.txt'),
        `some text`
      );

      const response = await GET();
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.success).toBe(true);
      expect(responseBody.count).toBe(2);
      expect(responseBody.tools).toHaveLength(2);

      const toolOne = responseBody.tools.find((t: any) => t.id === 'tool-one');
      const toolTwo = responseBody.tools.find((t: any) => t.id === 'tool-two');

      expect(toolOne.description).toBe('Description for tool one.');
      expect(toolTwo.name).toBe('tool two'); // Check human-readable name
    });

    it('should handle a non-existent pages directory gracefully', async () => {
        // Setup: remove the mocked pages directory
        mock.restore(); // restore real fs
        mock({
          // Don't create the 'pages' directory
        });

        const response = await GET();
        const responseBody = await response.json();
  
        expect(response.status).toBe(200);
        expect(responseBody.success).toBe(true);
        expect(responseBody.tools).toEqual([]);
    });

    it('should extract description correctly from various comment formats', async () => {
      // Test different comment formats that might be generated
      await fs.writeFile(
        path.join(pagesDir, 'format-test-1.tsx'),
        `/*\n * Simple description\n * Generated UI Tool Component\n */\n// React component code...`
      );
      await fs.writeFile(
        path.join(pagesDir, 'format-test-2.tsx'),
        `/*\n * Multi-line description with special chars: @#$%^&*()\n * Generated UI Tool Component\n */\n// More code...`
      );

      const response = await GET();
      const responseBody = await response.json();
      
      expect(responseBody.tools).toHaveLength(2);
      
      const tool1 = responseBody.tools.find((t: any) => t.id === 'format-test-1');
      const tool2 = responseBody.tools.find((t: any) => t.id === 'format-test-2');
      
      expect(tool1.description).toBe('Simple description');
      expect(tool2.description).toBe('Multi-line description with special chars: @#$%^&*()');
    });

    it('should handle tools with complex naming patterns', async () => {
      // Test various tool names and their sanitization
      const testTools = [
        { name: 'My Complex Tool Name!', expectedId: 'my-complex-tool-name', description: 'Complex tool desc', code: 'const Comp1 = () => <div>Test</div>;' },
        { name: 'tool-with-dashes', expectedId: 'tool-with-dashes', description: 'Dashed tool desc', code: 'const Comp2 = () => <div>Test</div>;' },
        { name: 'Tool123Numbers', expectedId: 'tool123numbers', description: 'Numbered tool desc', code: 'const Comp3 = () => <div>Test</div>;' }
      ];

      for (const tool of testTools) {
        const request = new MockNextRequest(tool) as unknown as NextRequest;
        await POST(request);
      }

      const response = await GET();
      const responseBody = await response.json();

      expect(responseBody.tools).toHaveLength(3);
      
      for (const expectedTool of testTools) {
        const foundTool = responseBody.tools.find((t: any) => t.id === expectedTool.expectedId);
        expect(foundTool).toBeDefined();
        expect(foundTool.description).toBe(expectedTool.description);
      }
    });

    it('should preserve tool registry after simulated hot reload', async () => {
      // Simulate registering a tool
      const toolData = {
        name: 'Hot Reload Test Tool',
        description: 'Tool for testing hot reload persistence',
        code: 'const Component = () => <div>Hot reload test</div>;',
      };

      const request = new MockNextRequest(toolData) as unknown as NextRequest;
      await POST(request);

      // Verify tool was created
      let response = await GET();
      let responseBody = await response.json();
      expect(responseBody.tools).toHaveLength(1);
      expect(responseBody.tools[0].description).toBe(toolData.description);

      // Simulate hot reload by reading the registry again (simulating in-memory registry reload)
      response = await GET();
      responseBody = await response.json();
      
      // Tool should still be available after hot reload
      expect(responseBody.tools).toHaveLength(1);
      expect(responseBody.tools[0].id).toBe('hot-reload-test-tool');
      expect(responseBody.tools[0].description).toBe(toolData.description);
    });
  });
}); 