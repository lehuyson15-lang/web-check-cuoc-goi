const { Client } = require('pg');

const password = "thanhcong123";
const projectRef = "rtgbreoklkuoinfpstsc";

const configs = [
  {
    name: "Direct Connection",
    uri: `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`
  },
  {
    name: "Session Pooler (User with suffix)",
    uri: `postgresql://postgres.${projectRef}:${password}@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres`
  },
  {
    name: "Transaction Pooler (User with suffix)",
    uri: `postgresql://postgres.${projectRef}:${password}@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres`
  },
  {
      name: "Session Pooler (User without suffix)",
      uri: `postgresql://postgres:${password}@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres`
  }
];

async function testConfig(config) {
  console.log(`--- Testing: ${config.name} ---`);
  const client = new Client({ connectionString: config.uri, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    console.log(`✅ SUCCESS: ${config.name}`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`❌ FAILED: ${config.name} - ${err.message}`);
    return false;
  }
}

async function runAll() {
  for (const config of configs) {
    await testConfig(config);
  }
}

runAll();
