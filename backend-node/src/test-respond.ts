import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_jwt_key_for_steps_app';

async function main() {
  try {
    // Manually sign a token for Arjun Kumar
    const token = jwt.sign(
      { 
        id: 'c807bf6b-a11d-48ca-b627-444fa93cfced', 
        role: 'STUDENT', 
        email: 'arjun.kumar2025@gmail.com' 
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );
    console.log('Manually signed token for Arjun Kumar.');

    const respondRes = await fetch(
      'http://localhost:3000/api/applications/72c7cb55-7ac9-4447-9df9-428550cbfa1d/respond',
      {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ response: 'ACCEPTED' })
      }
    );
    
    const status = respondRes.status;
    const text = await respondRes.text();
    console.log('Response from server status:', status);
    console.log('Response text:', text);
  } catch (error: any) {
    console.error('Request Error:', error.message);
  }
}

main();
