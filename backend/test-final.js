const { Client } = require('pg');

const connectionString = "postgresql://postgres.rtgbreoklkuoinfpstsc:thanhcong123@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres";

const client = new Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function test() {
  try {
    console.log('Connecting with SSL (rejectUnauthorized: false)...');
    await client.connect();
    console.log('Successfully connected!');
    const res = await client.query('SELECT NOW()');
    console.log('Query result:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('Connection failed:', err.message);
    process.exit(1);
  }
}

test();
