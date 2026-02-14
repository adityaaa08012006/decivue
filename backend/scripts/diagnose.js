#!/usr/bin/env node
/**
 * Backend Diagnostic Tool
 * Checks all endpoints and configuration
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001';

// Test endpoints
const tests = [
  { name: 'Health Check', path: '/health', method: 'GET' },
  { name: 'API Root', path: '/api', method: 'GET' },
];

function testEndpoint(test) {
  return new Promise((resolve) => {
    const url = `${BASE_URL}${test.path}`;

    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ...test,
          status: res.statusCode,
          success: res.statusCode >= 200 && res.statusCode < 300,
          response: data
        });
      });
    }).on('error', (err) => {
      resolve({
        ...test,
        status: 0,
        success: false,
        error: err.message
      });
    });
  });
}

async function runDiagnostics() {
  console.log('🔍 Running Backend Diagnostics...\n');

  // Test if backend is running
  console.log('1. Testing Backend Connection...');
  const results = await Promise.all(tests.map(testEndpoint));

  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.name}: ${result.status || 'FAILED'}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log('\n2. Environment Variables Check:');
  const requiredEnv = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'PORT'
  ];

  requiredEnv.forEach(env => {
    const exists = process.env[env] ? '✅' : '❌';
    console.log(`${exists} ${env}: ${process.env[env] ? 'Set' : 'Missing'}`);
  });

  console.log('\n3. Server Status:');
  const allSuccess = results.every(r => r.success);
  if (allSuccess) {
    console.log('✅ Backend is running and responding');
    console.log('✅ All endpoints are accessible');
  } else {
    console.log('❌ Backend has connection issues');
    console.log('\nTroubleshooting:');
    console.log('1. Make sure backend is running: cd backend && npm run dev');
    console.log('2. Check for port conflicts (port 3001)');
    console.log('3. Review backend console for errors');
  }
}

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

runDiagnostics().catch(console.error);
