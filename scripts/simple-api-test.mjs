// This script sends a simple request to the chat API to test its health.
// It doesn't require any external dependencies, just Node.js.

async function runTest() {
  const API_URL = 'http://localhost:4000/api/chat';
  const requestBody = {
    messages: [{ role: 'user', content: 'Hello, world! Please give a short reply.' }],
  };

  console.log(`Sending POST request to ${API_URL}...`);
  console.log('Request body:', JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`\nResponse Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      console.error('API request failed. Full response body:');
      const errorText = await response.text();
      console.error(errorText);
      return;
    }

    console.log('\nStreaming response from API:');
    console.log('----------------------------');
    
    // The response body is a stream. We read it chunk by chunk.
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        // The Vercel AI SDK stream format is a bit noisy for simple console logging.
        // We'll process it slightly to make it more readable.
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        for (const line of lines) {
            // e.g., '0:"Hello"' -> 'Hello'
            // e.g., '3:"An error occurred"' -> 'Error: An error occurred'
            const match = line.match(/^[0-9]:"(.*)"$/);
            if (match && match[1]) {
                const content = JSON.parse(`"${match[1]}"`); // Safely unescape content
                if(line.startsWith('3:')) {
                    console.log(`[ERROR] ${content}`);
                } else {
                    process.stdout.write(content);
                }
            }
        }
      }
    }
    console.log('\n----------------------------');
    console.log('Stream finished.');

  } catch (error) {
    console.error('\nFailed to connect to the server or run the test:', error.message);
    console.log('Please ensure the development server is running on http://localhost:4000 via `npm run dev`');
  }
}

runTest(); 