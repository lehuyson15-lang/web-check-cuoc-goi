const axios = require('axios');

async function testApi() {
  try {
    console.log('Testing Login...');
    const loginRes = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@clinic.com',
      password: 'password123'
    });
    
    const token = loginRes.data.token;
    console.log('Login Successful, token received.');

    console.log('Testing Reports KPI...');
    const kpiRes = await axios.get('http://localhost:5001/api/reports/kpi', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('KPI Data:', JSON.stringify(kpiRes.data, null, 2));
    
  } catch (error) {
    console.error('API Test Failed:', error.response?.data || error.message);
  }
}

testApi();
