import React from 'react';

function TestApp() {
  return (
    <div style={{ padding: '20px', background: '#1a1a1a', minHeight: '100vh', color: 'white' }}>
      <h1>🚀 SOMA Dashboard Test</h1>
      <p>If you can see this, React is working!</p>
      <button onClick={() => alert('Button works!')}>Test Button</button>
    </div>
  );
}

export default TestApp;
