import { spawn } from 'child_process';
import { readFile, writeFile, unlink, access } from 'fs/promises';
import path from 'path';

const API_URL = 'http://localhost:4000/api/ui-register';
const PAGES_DIR = path.join(process.cwd(), 'pages');
const TEST_TOOL_ID = 'e2e-test-tool';
const TEST_TOOL_PATH = path.join(PAGES_DIR, `${TEST_TOOL_ID}.tsx`);

async function waitForServer(url, timeout = 45000) {
  const startTime = Date.now();
  console.log('Waiting for server to start...');
  while (Date.now() - startTime < timeout) {
    try {
      // Using a simple GET endpoint, assuming root serves something or API is up
      const response = await fetch('http://localhost:4000');
      if (response.ok) {
        console.log('Server is ready!');
        return true;
      }
    } catch (err) {
      // Ignore errors, just retry
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('Server did not start within the timeout period.');
}

async function runTest() {
  console.log('--- Running E2E Test ---');

  // 1. POST to create a new tool
  console.log('Step 1: Registering a new tool via POST...');
  const toolData = {
    name: 'E2E Test Tool',
    description: 'This is an E2E test tool.',
    code: 'export default () => <div>E2E Test</div>;',
  };

  const postResponse = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toolData),
  });

  if (!postResponse.ok) throw new Error(`POST request failed with status ${postResponse.status}`);
  const postResult = await postResponse.json();
  if (!postResult.success || postResult.tool.id !== TEST_TOOL_ID) {
    throw new Error(`Tool registration failed or returned incorrect data: ${JSON.stringify(postResult)}`);
  }
  console.log('Step 1 PASSED.');

  // 2. Verify file was created
  console.log('Step 2: Verifying file creation on the file system...');
  try {
    await access(TEST_TOOL_PATH);
    const content = await readFile(TEST_TOOL_PATH, 'utf-8');
    if (!content.includes(toolData.description) || !content.includes(toolData.code)) {
      throw new Error('File content is incorrect.');
    }
    console.log('Step 2 PASSED.');
  } catch (error) {
    throw new Error(`File verification failed: ${error.message}`);
  }

  // 3. GET to verify the tool is listed
  console.log('Step 3: Verifying the new tool is listed via GET...');
  const getResponse = await fetch(API_URL);
  if (!getResponse.ok) throw new Error(`GET request failed with status ${getResponse.status}`);
  const getResult = await getResponse.json();
  const foundTool = getResult.tools.find(t => t.id === TEST_TOOL_ID);
  
  if (!foundTool || foundTool.description !== toolData.description) {
    throw new Error(`Tool not found in GET response or has incorrect data: ${JSON.stringify(getResult)}`);
  }
  console.log('Step 3 PASSED.');
  
  console.log('\n✅ All E2E tests passed!');
}

async function main() {
  let server;
  try {
    // Start the Next.js server
    server = spawn('npm', ['run', 'dev'], { detached: true }); // detached for easier killing
    
    server.stdout.on('data', data => console.log(`[Server] ${data.toString().trim()}`));
    server.stderr.on('data', data => console.error(`[Server ERROR] ${data.toString().trim()}`));

    await waitForServer(API_URL);
    await runTest();

  } catch (error) {
    console.error('\n❌ E2E test failed:', error);
    process.exitCode = 1;
  } finally {
    console.log('\n--- Cleaning up ---');
    // Stop the server
    if (server) {
      console.log('Stopping server...');
      // Kill the entire process group
      try {
        process.kill(-server.pid);
        console.log('Server process stopped.');
      } catch (e) {
        console.error('Failed to kill server process:', e.message);
      }
    }
    // Clean up test file
    try {
      await access(TEST_TOOL_PATH);
      await unlink(TEST_TOOL_PATH);
      console.log('Cleaned up test file.');
    } catch (error) {
      // File might not exist if test failed early, that's ok.
    }
  }
}

main(); 