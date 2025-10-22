const fetch = require('node:fetch');

async function testAPI() {
  const baseUrl = 'http://localhost:4000';
  
  console.log('🧪 Testing UI Tool Registry API...\n');
  
  // Test 1: Register a UI tool
  console.log('1. Testing tool registration...');
  const toolData = {
    name: 'Simple Counter',
    description: 'A basic counter component with increment/decrement buttons',
    code: `import { useState } from 'react';

export default function SimpleCounter() {
  const [count, setCount] = useState(0);
  
  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <h2 className="text-xl font-bold mb-4">Counter: {count}</h2>
      <div className="space-x-2">
        <button 
          onClick={() => setCount(count - 1)}
          className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
        >
          -
        </button>
        <button 
          onClick={() => setCount(count + 1)}
          className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
        >
          +
        </button>
      </div>
    </div>
  );
}`
  };

  try {
    const registerResponse = await fetch(`${baseUrl}/api/ui-register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toolData)
    });
    
    const registerResult = await registerResponse.json();
    console.log('✅ Registration result:', registerResult);
    
    // Test 2: List registered tools
    console.log('\n2. Testing tool listing...');
    const listResponse = await fetch(`${baseUrl}/api/ui-register`);
    const listResult = await listResponse.json();
    console.log('✅ Tools list:', listResult);
    
    console.log('\n🎉 All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAPI();