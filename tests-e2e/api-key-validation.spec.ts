import { test, expect } from '@playwright/test';

test.describe('Google API Key Validation Test', () => {
    const CHAT_API_URL = 'http://localhost:4000/api/chat';

    test('should receive a valid streaming response from the chat API', async ({ request }) => {
        // This test directly calls the API endpoint, bypassing the UI.
        // It's a direct test of the backend's ability to use the Google API key.
        const response = await request.post(CHAT_API_URL, {
            data: {
                // We send a minimal message history
                messages: [{ role: 'user', content: 'Hello, this is a test. Please respond with a single word: OK.' }],
            },
            // The response is a stream, so we don't set a timeout here.
            // Playwright will wait for the request to complete.
        });

        // 1. Check for a successful HTTP status code (200).
        // If this fails, the API route handler has a fundamental error.
        expect(response.ok(), `API responded with status ${response.status()}: ${await response.text()}`).toBeTruthy();

        // 2. Check the response body.
        // The Vercel AI SDK streams data in a specific format (e.g., '0:"Hello"\\n').
        const responseText = await response.text();

        // A successful stream should not be empty.
        expect(responseText, 'API response body was empty.').not.toBe('');
        
        // We expect the stream to contain data chunks prefixed by the SDK.
        // A simple check for the '0:"' prefix is a good indicator of a valid stream.
        expect(responseText, 'API response did not seem to be a valid Vercel AI SDK stream.').toContain('0:');
        
        console.log('Simple API Test Response Text:', responseText);
        
        // A more robust check to see if the AI's content is in the stream.
        expect(responseText.toLowerCase(), 'The AI response "ok" was not found in the stream.').toContain('ok');
    });
}); 