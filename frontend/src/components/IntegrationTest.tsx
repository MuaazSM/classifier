// frontend/src/components/IntegrationTest.tsx
'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  duration?: number;
}

export default function IntegrationTest() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Backend Health Check', status: 'pending', message: 'Checking...' },
    { name: 'Load Departments', status: 'pending', message: 'Checking...' },
    { name: 'Start Classification', status: 'pending', message: 'Checking...' },
    { name: 'Submit Test Answer', status: 'pending', message: 'Checking...' },
  ]);

  const [currentTest, setCurrentTest] = useState(0);
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    runTests();
  }, []);

  const updateTest = (index: number, updates: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => 
      i === index ? { ...test, ...updates } : test
    ));
  };

  const runTests = async () => {
    let testSessionId = '';

    // Test 1: Health Check
    try {
      setCurrentTest(0);
      const startTime = Date.now();
      await api.getHealth();
      const duration = Date.now() - startTime;
      updateTest(0, { 
        status: 'success', 
        message: `Backend is healthy (${duration}ms)`,
        duration 
      });
    } catch (error: any) {
      updateTest(0, { 
        status: 'error', 
        message: `Health check failed: ${error.message}` 
      });
      return; // Stop if backend is down
    }

    // Test 2: Load Departments
    try {
      setCurrentTest(1);
      const startTime = Date.now();
      const response = await api.getDepartments();
      const duration = Date.now() - startTime;
      updateTest(1, { 
        status: 'success', 
        message: `Loaded ${response.departments.length} departments (${duration}ms)`,
        duration 
      });
    } catch (error: any) {
      updateTest(1, { 
        status: 'error', 
        message: `Failed to load departments: ${error.message}` 
      });
    }

    // Test 3: Start Classification
    try {
      setCurrentTest(2);
      const startTime = Date.now();
      const response = await api.startClassification();
      const duration = Date.now() - startTime;
      testSessionId = response.session_id;
      setSessionId(testSessionId);
      updateTest(2, { 
        status: 'success', 
        message: `Started session ${testSessionId.slice(0, 8)}... (${duration}ms)`,
        duration 
      });
    } catch (error: any) {
      updateTest(2, { 
        status: 'error', 
        message: `Failed to start classification: ${error.message}` 
      });
      return; // Stop if can't start session
    }

    // Test 4: Submit Test Answer
    try {
      setCurrentTest(3);
      const startTime = Date.now();
      const response = await api.submitAnswer(testSessionId, 'seed_001', 3, 0.8);
      const duration = Date.now() - startTime;
      updateTest(3, { 
        status: 'success', 
        message: `Answer submitted, ${response.classification_result.questions_asked} questions asked (${duration}ms)`,
        duration 
      });
    } catch (error: any) {
      updateTest(3, { 
        status: 'error', 
        message: `Failed to submit answer: ${error.message}` 
      });
    }

    setCurrentTest(-1); // Tests complete
  };

  const getIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="w-4 h-4 animate-spin text-gray-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const allPassed = tests.every(test => test.status === 'success');
  const hasErrors = tests.some(test => test.status === 'error');

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Frontend-Backend Integration Test</h2>
        <p className="text-gray-600">
          Testing connection and functionality between frontend and backend services.
        </p>
      </div>

      <div className="space-y-4">
        {tests.map((test, index) => (
          <div
            key={index}
            className={`p-4 border rounded-lg transition-colors ${
              currentTest === index
                ? 'border-blue-500 bg-blue-50'
                : test.status === 'success'
                ? 'border-green-500 bg-green-50'
                : test.status === 'error'
                ? 'border-red-500 bg-red-50'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getIcon(test.status)}
                <span className="font-medium text-gray-800">{test.name}</span>
              </div>
              {test.duration && (
                <span className="text-xs text-gray-500">{test.duration}ms</span>
              )}
            </div>
            <p className={`mt-2 text-sm ${
              test.status === 'error' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {test.message}
            </p>
          </div>
        ))}
      </div>

      {currentTest === -1 && (
        <div className={`mt-6 p-4 rounded-lg ${
          allPassed 
            ? 'bg-green-100 border border-green-500' 
            : hasErrors 
            ? 'bg-red-100 border border-red-500'
            : 'bg-yellow-100 border border-yellow-500'
        }`}>
          <div className="flex items-center space-x-2">
            {allPassed ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : hasErrors ? (
              <XCircle className="w-5 h-5 text-red-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            )}
            <span className={`font-semibold ${
              allPassed ? 'text-green-800' : hasErrors ? 'text-red-800' : 'text-yellow-800'
            }`}>
              {allPassed 
                ? '✅ All tests passed! Integration is working correctly.'
                : hasErrors
                ? '❌ Some tests failed. Check backend connection and configuration.'
                : '⚠️ Tests completed with warnings.'
              }
            </span>
          </div>
          
          {sessionId && (
            <p className="mt-2 text-sm text-gray-600">
              Test session ID: <code className="bg-gray-200 px-1 rounded">{sessionId}</code>
            </p>
          )}
          
          <button
            onClick={runTests}
            className="mt-3 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
          >
            Run Tests Again
          </button>
        </div>
      )}

      {hasErrors && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">Troubleshooting Tips:</h3>
          <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
            <li>Make sure the backend server is running on <code>http://localhost:8000</code></li>
            <li>Check that CORS is properly configured in the backend</li>
            <li>Verify that the API endpoints match between frontend and backend</li>
            <li>Check browser console for detailed error messages</li>
            <li>Ensure environment variables are set correctly</li>
          </ul>
        </div>
      )}
    </div>
  );
}