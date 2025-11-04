// Quick test to verify Supabase connection works
// Run with: node test-supabase-connection.js

const SUPABASE_URL = 'https://qhbrnotooiutpwwtadlx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYnJub3Rvb2l1dHB3d3RhZGx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDU0NDYsImV4cCI6MjA3NjA4MTQ0Nn0.1Aj-VLd_2skyTAvIC6Hy9A2avh4D6gnucgmQlbAeXbw';

console.log('Testing Supabase connection...');
console.log('URL:', SUPABASE_URL);
console.log('');

// Test basic REST API access
fetch(`${SUPABASE_URL}/rest/v1/`, {
  method: 'GET',
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`
  }
})
.then(response => {
  console.log('✓ HTTP Status:', response.status, response.statusText);
  if (response.ok) {
    console.log('✅ Connection successful!');
    console.log('Supabase project is accessible.');
  } else {
    console.log('❌ Connection failed:', response.status);
    return response.text();
  }
})
.then(text => {
  if (text) console.log('Response:', text.substring(0, 200));
  console.log('');
  console.log('Next: Test if memories table exists...');
  
  // Test memories table
  return fetch(`${SUPABASE_URL}/rest/v1/memories?select=id&limit=1`, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=representation'
    }
  });
})
.then(response => {
  if (response.status === 200 || response.status === 206) {
    console.log('✅ Memories table exists and is accessible!');
  } else if (response.status === 404 || response.status === 400) {
    console.log('⚠️  Memories table does not exist yet.');
    console.log('   Run COMPLETE_DATABASE_SETUP.sql in Supabase SQL Editor');
  } else {
    console.log('❌ Error accessing table:', response.status);
    return response.text();
  }
})
.then(text => {
  if (text) console.log('Response:', text);
})
.catch(error => {
  console.error('❌ Network error:', error.message);
  console.error('Check:');
  console.error('1. Internet connection');
  console.error('2. Supabase project is active');
  console.error('3. URL is correct');
});

