/**
 * API Test Suite for School Result App
 * Tests all API endpoints with various scenarios
 */

const BASE_URL = 'http://localhost:3000/api';

// Test configuration
const TEST_CONFIG = {
  // Mock authentication headers (replace with actual auth tokens)
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': 'test-user-123', // Mock user ID for endpoints that need it
  },
  // Test data
  testData: {
    validUUID: '550e8400-e29b-41d4-a716-446655440000',
    invalidUUID: 'invalid-uuid',
    validDate: '2005-01-15',
    validToken: 'test-token-123',
  }
};

// Test results storage
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Utility functions
function logTest(endpoint, method, scenario, status, response, error = null) {
  const result = {
    endpoint,
    method,
    scenario,
    status,
    success: status >= 200 && status < 400,
    response: response ? JSON.stringify(response).substring(0, 200) : null,
    error: error ? error.message : null,
    timestamp: new Date().toISOString()
  };
  
  testResults.details.push(result);
  testResults.total++;
  
  if (result.success) {
    testResults.passed++;
    console.log(`✅ ${method} ${endpoint} - ${scenario}: ${status}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${method} ${endpoint} - ${scenario}: ${status} - ${error?.message || 'Unknown error'}`);
  }
}

async function makeRequest(endpoint, method = 'GET', body = null, headers = {}) {
  try {
    const config = {
      method,
      headers: { ...TEST_CONFIG.headers, ...headers },
    };
    
    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    const data = await response.json().catch(() => null);
    
    return { status: response.status, data };
  } catch (error) {
    return { status: 0, error };
  }
}

// Test functions for each endpoint

async function testStudentsBulkImport() {
  console.log('\n🧪 Testing /students/bulk-import');
  
  // Test 1: Valid bulk import
  const validData = {
    classId: TEST_CONFIG.testData.validUUID,
    students: [
      {
        name: "John Doe",
        rollNo: 1,
        section: "A",
        dob: TEST_CONFIG.testData.validDate,
        contact: "1234567890",
        parentName: "Parent Name",
        fathersName: "Father Name",
        mothersName: "Mother Name",
        address: "123 Street",
        gender: "Male"
      }
    ]
  };
  
  const { status: status1, data: data1, error: error1 } = await makeRequest('/students/bulk-import', 'POST', validData);
  logTest('/students/bulk-import', 'POST', 'Valid bulk import', status1, data1, error1);
  
  // Test 2: Invalid class ID
  const invalidClassData = { ...validData, classId: 'invalid-uuid' };
  const { status: status2, data: data2, error: error2 } = await makeRequest('/students/bulk-import', 'POST', invalidClassData);
  logTest('/students/bulk-import', 'POST', 'Invalid class ID', status2, data2, error2);
  
  // Test 3: Missing required fields
  const missingFieldsData = {
    classId: TEST_CONFIG.testData.validUUID,
    students: [{ name: "John Doe" }] // Missing required fields
  };
  const { status: status3, data: data3, error: error3 } = await makeRequest('/students/bulk-import', 'POST', missingFieldsData);
  logTest('/students/bulk-import', 'POST', 'Missing required fields', status3, data3, error3);
  
  // Test 4: Empty students array
  const emptyData = { classId: TEST_CONFIG.testData.validUUID, students: [] };
  const { status: status4, data: data4, error: error4 } = await makeRequest('/students/bulk-import', 'POST', emptyData);
  logTest('/students/bulk-import', 'POST', 'Empty students array', status4, data4, error4);
}

async function testMarksBulkImport() {
  console.log('\n🧪 Testing /marks/bulk-import');
  
  // Test 1: Valid marks import
  const validData = {
    examId: TEST_CONFIG.testData.validUUID,
    classId: TEST_CONFIG.testData.validUUID,
    marks: [
      {
        studentRollNo: 1,
        subjectName: "Mathematics",
        subjectPartName: "Theory",
        obtained: 85,
        converted: 85
      }
    ]
  };
  
  const { status: status1, data: data1, error: error1 } = await makeRequest('/marks/bulk-import', 'POST', validData);
  logTest('/marks/bulk-import', 'POST', 'Valid marks import', status1, data1, error1);
  
  // Test 2: Invalid exam ID
  const invalidExamData = { ...validData, examId: 'invalid-uuid' };
  const { status: status2, data: data2, error: error2 } = await makeRequest('/marks/bulk-import', 'POST', invalidExamData);
  logTest('/marks/bulk-import', 'POST', 'Invalid exam ID', status2, data2, error2);
  
  // Test 3: Negative marks
  const negativeMarksData = {
    ...validData,
    marks: [{ ...validData.marks[0], obtained: -10 }]
  };
  const { status: status3, data: data3, error: error3 } = await makeRequest('/marks/bulk-import', 'POST', negativeMarksData);
  logTest('/marks/bulk-import', 'POST', 'Negative marks', status3, data3, error3);
}

async function testFlexibleMarks() {
  console.log('\n🧪 Testing /flexible-marks');
  
  // Test 1: Valid flexible marks
  const validData = {
    examId: TEST_CONFIG.testData.validUUID,
    studentId: TEST_CONFIG.testData.validUUID,
    subjectId: TEST_CONFIG.testData.validUUID,
    marks: [
      { partId: TEST_CONFIG.testData.validUUID, obtained: 85 }
    ]
  };
  
  const { status: status1, data: data1, error: error1 } = await makeRequest('/flexible-marks', 'POST', validData);
  logTest('/flexible-marks', 'POST', 'Valid flexible marks', status1, data1, error1);
  
  // Test 2: Missing authentication
  const { status: status2, data: data2, error: error2 } = await makeRequest('/flexible-marks', 'POST', validData, { 'x-user-id': '' });
  logTest('/flexible-marks', 'POST', 'Missing authentication', status2, data2, error2);
  
  // Test 3: Missing required fields
  const incompleteData = { examId: TEST_CONFIG.testData.validUUID };
  const { status: status3, data: data3, error: error3 } = await makeRequest('/flexible-marks', 'POST', incompleteData);
  logTest('/flexible-marks', 'POST', 'Missing required fields', status3, data3, error3);
}

async function testPublicResultVerify() {
  console.log('\n🧪 Testing /public-result/verify');
  
  // Test 1: Valid verification request
  const validData = {
    token: TEST_CONFIG.testData.validToken,
    dob: TEST_CONFIG.testData.validDate
  };
  
  const { status: status1, data: data1, error: error1 } = await makeRequest('/public-result/verify', 'POST', validData);
  logTest('/public-result/verify', 'POST', 'Valid verification', status1, data1, error1);
  
  // Test 2: Missing token
  const missingTokenData = { dob: TEST_CONFIG.testData.validDate };
  const { status: status2, data: data2, error: error2 } = await makeRequest('/public-result/verify', 'POST', missingTokenData);
  logTest('/public-result/verify', 'POST', 'Missing token', status2, data2, error2);
  
  // Test 3: Missing DOB
  const missingDobData = { token: TEST_CONFIG.testData.validToken };
  const { status: status3, data: data3, error: error3 } = await makeRequest('/public-result/verify', 'POST', missingDobData);
  logTest('/public-result/verify', 'POST', 'Missing DOB', status3, data3, error3);
  
  // Test 4: Invalid token
  const invalidTokenData = { token: 'invalid-token', dob: TEST_CONFIG.testData.validDate };
  const { status: status4, data: data4, error: error4 } = await makeRequest('/public-result/verify', 'POST', invalidTokenData);
  logTest('/public-result/verify', 'POST', 'Invalid token', status4, data4, error4);
}

async function testMarksBulk() {
  console.log('\n🧪 Testing /marks/bulk');
  
  // Test 1: Valid bulk marks update
  const validData = {
    examId: TEST_CONFIG.testData.validUUID,
    subjectId: TEST_CONFIG.testData.validUUID,
    items: [
      {
        studentId: TEST_CONFIG.testData.validUUID,
        subjectPartId: TEST_CONFIG.testData.validUUID,
        obtained: 85,
        converted: 85
      }
    ]
  };
  
  const { status: status1, data: data1, error: error1 } = await makeRequest('/marks/bulk', 'POST', validData);
  logTest('/marks/bulk', 'POST', 'Valid bulk marks', status1, data1, error1);
  
  // Test 2: Invalid payload structure
  const invalidData = { examId: TEST_CONFIG.testData.validUUID };
  const { status: status2, data: data2, error: error2 } = await makeRequest('/marks/bulk', 'POST', invalidData);
  logTest('/marks/bulk', 'POST', 'Invalid payload', status2, data2, error2);
}

async function testExamSubjectSettings() {
  console.log('\n🧪 Testing /exam-subject-settings/bulk');
  
  // Test 1: Valid exam subject settings
  const validData = {
    examId: TEST_CONFIG.testData.validUUID,
    items: [
      {
        subjectId: TEST_CONFIG.testData.validUUID,
        fullMark: 100,
        passMark: 40,
        hasConversion: true,
        convertToMark: 80
      }
    ]
  };
  
  const { status: status1, data: data1, error: error1 } = await makeRequest('/exam-subject-settings/bulk', 'POST', validData);
  logTest('/exam-subject-settings/bulk', 'POST', 'Valid settings', status1, data1, error1);
  
  // Test 2: Invalid payload
  const invalidData = { examId: TEST_CONFIG.testData.validUUID, items: "not-an-array" };
  const { status: status2, data: data2, error: error2 } = await makeRequest('/exam-subject-settings/bulk', 'POST', invalidData);
  logTest('/exam-subject-settings/bulk', 'POST', 'Invalid payload', status2, data2, error2);
}

async function testExamSubjectPartSettings() {
  console.log('\n🧪 Testing /exam-subject-part-settings/bulk');
  
  // Test 1: Valid part settings
  const validData = {
    examId: TEST_CONFIG.testData.validUUID,
    items: [
      {
        subjectId: TEST_CONFIG.testData.validUUID,
        partType: "Theory",
        fullMark: 80,
        passMark: 32,
        hasConversion: false
      }
    ]
  };
  
  const { status: status1, data: data1, error: error1 } = await makeRequest('/exam-subject-part-settings/bulk', 'POST', validData);
  logTest('/exam-subject-part-settings/bulk', 'POST', 'Valid part settings', status1, data1, error1);
}

async function testMasterSubjects() {
  console.log('\n🧪 Testing /master-subjects/[id]');
  
  const testId = TEST_CONFIG.testData.validUUID;
  
  // Test 1: GET with usage action
  const { status: status1, data: data1, error: error1 } = await makeRequest(`/master-subjects/${testId}?action=usage`, 'GET');
  logTest(`/master-subjects/${testId}`, 'GET', 'Get usage info', status1, data1, error1);
  
  // Test 2: GET without authentication
  const { status: status2, data: data2, error: error2 } = await makeRequest(`/master-subjects/${testId}?action=usage`, 'GET', null, { 'x-user-id': '' });
  logTest(`/master-subjects/${testId}`, 'GET', 'No authentication', status2, data2, error2);
  
  // Test 3: DELETE request
  const { status: status3, data: data3, error: error3 } = await makeRequest(`/master-subjects/${testId}`, 'DELETE');
  logTest(`/master-subjects/${testId}`, 'DELETE', 'Delete master subject', status3, data3, error3);
  
  // Test 4: Invalid action
  const { status: status4, data: data4, error: error4 } = await makeRequest(`/master-subjects/${testId}?action=invalid`, 'GET');
  logTest(`/master-subjects/${testId}`, 'GET', 'Invalid action', status4, data4, error4);
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting API Test Suite for School Result App');
  console.log('=' .repeat(60));
  
  const startTime = Date.now();
  
  try {
    await testStudentsBulkImport();
    await testMarksBulkImport();
    await testFlexibleMarks();
    await testPublicResultVerify();
    await testMarksBulk();
    await testExamSubjectSettings();
    await testExamSubjectPartSettings();
    await testMasterSubjects();
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  // Generate test report
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST REPORT SUMMARY');
  console.log('=' .repeat(60));
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed} ✅`);
  console.log(`Failed: ${testResults.failed} ❌`);
  console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  console.log(`Duration: ${duration}s`);
  
  // Detailed results
  console.log('\n📋 DETAILED RESULTS:');
  console.log('-' .repeat(60));
  
  testResults.details.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${result.method} ${result.endpoint}`);
    console.log(`   Scenario: ${result.scenario}`);
    console.log(`   Status: ${result.status}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.response) {
      console.log(`   Response: ${result.response}...`);
    }
    console.log('');
  });
  
  return testResults;
}

// Export for use in other files or run directly
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAllTests, testResults };
} else {
  // Run tests if executed directly
  runAllTests().then((results) => {
    console.log('🏁 Test suite completed!');
    process.exit(results.failed > 0 ? 1 : 0);
  });
}
