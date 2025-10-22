import { test, expect } from '@playwright/test';
import { rm } from 'fs/promises';
import path from 'path';

const UI_TOOL_ID = 'playwright-test-tool';
const UI_TOOL_PAGE_URL = `/${UI_TOOL_ID}`;
const UI_TOOL_FILE_PATH = path.join(process.cwd(), 'pages', `${UI_TOOL_ID}.tsx`);
const API_REGISTER_URL = '/api/ui-register';

test.describe('UI Tool Rendering and Style E2E Test', () => {
  // Before all tests, create a new UI tool via API
  test.beforeAll(async ({ request }) => {
    const toolData = {
      name: 'Playwright Test Tool',
      description: 'A tool for E2E rendering tests.',
      // This code includes a shadcn Button.
      code: `
        import { Button } from '@/components/ui/button';
        export default function TestPage() {
          return (
            <div style={{ padding: '20px' }}>
              <h1>Render Test</h1>
              <Button variant="default">Click Me</Button>
            </div>
          );
        }
      `,
    };

    const response = await request.post(API_REGISTER_URL, {
      data: toolData,
    });
    await expect(response.ok()).toBeTruthy();
  });

  // After all tests, clean up the created file
  test.afterAll(async () => {
    try {
      await rm(UI_TOOL_FILE_PATH, { force: true });
      console.log(`Cleaned up: ${UI_TOOL_FILE_PATH}`);
    } catch (error) {
      console.error(`Error during cleanup:`, error);
    }
  });

  test('should render the component and be visible', async ({ page }) => {
    // Navigate to the newly created page
    await page.goto(UI_TOOL_PAGE_URL);

    // 1. Check if the main heading is visible
    await expect(page.getByRole('heading', { name: 'Render Test' })).toBeVisible();

    // 2. Locate the shadcn button and verify it's visible.
    // This confirms the component is rendered without being overly specific about styles.
    const button = page.getByRole('button', { name: 'Click Me' });
    await expect(button).toBeVisible();
  });
}); 