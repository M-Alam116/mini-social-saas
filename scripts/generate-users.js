const fs = require('fs');

async function main() {
  console.log('Generating 50 test users...');
  const tokens = [];

  for (let i = 1; i <= 50; i++) {
    const email = `testuser${i}_${Date.now()}@example.com`;
    const password = 'password123';

    try {
      // Register
      const regRes = await fetch('http://localhost:8080/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Test User ${i}`, email, password, country: 'US' }),
      });
      if (!regRes.ok) console.error('Reg failed:', await regRes.text());

      // Login
      const loginRes = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (loginRes.ok) {
        const data = await loginRes.json();
        if (data.data && data.data.access_token) {
          tokens.push(data.data.access_token);
        } else {
          console.error('No token in data:', data);
        }
      } else {
        console.error('Login failed:', await loginRes.text());
      }
    } catch (e) {
      console.error(`Error with user ${i}:`, e.message);
    }
  }

  fs.writeFileSync('tokens.json', JSON.stringify({ tokens }));
  console.log(`Successfully generated ${tokens.length} tokens and saved to tokens.json.`);
}

main();
