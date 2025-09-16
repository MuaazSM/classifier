// frontend/src/components/ClassificationQuiz.tsx - Debug version with proper API testing
'use client';
import { useState, useEffect } from 'react';
import { api, Question, ClassificationResult, ExplanationResponse } from '@/lib/api';
import { getDepartmentDisplayName } from '@/lib/departmentMapping';
import Waves from './Waves';
import { Loader2, CheckCircle, ArrowRight, Brain, Users, AlertCircle, Server, Wifi } from 'lucide-react';

interface ClassificationQuizProps {
  onComplete?: (result: ClassificationResult, explanation: ExplanationResponse) => void;
}

type QuizState = 'loading' | 'questioning' | 'processing' | 'complete' | 'error' | 'offline' | 'debug';

export default function ClassificationQuiz({ onComplete }: ClassificationQuizProps) {
  // State management
  const [state, setState] = useState<QuizState>('loading');
  const [sessionId, setSessionId] = useState<string>('');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number>(1.0);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [explanation, setExplanation] = useState<ExplanationResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Debug state
  const [debugInfo, setDebugInfo] = useState<any[]>([]);
  
  // Progress tracking
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [totalQuestions] = useState(12);

  // Initialize with debug check
  useEffect(() => {
    debugBackendConnection();
  }, []);

  const addDebugLog = (message: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [...prev, { timestamp, message, data }]);
    console.log(`[${timestamp}] ${message}`, data);
  };

  const debugBackendConnection = async () => {
    setState('debug');
    setDebugInfo([]);
    
    addDebugLog("🔍 Starting backend connection test...");
    
    try {
      // Test 1: Basic fetch to health endpoint
      addDebugLog("⏳ Testing health endpoint...");
      const healthResponse = await fetch('http://localhost:8000/api/v1/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        addDebugLog("✅ Health check passed", { 
          status: healthResponse.status,
          components: healthData.components 
        });
        
        // Test 2: Start classification
        addDebugLog("⏳ Testing classification start...");
        const startResponse = await fetch('http://localhost:8000/api/v1/classification/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        
        if (startResponse.ok) {
          const startData = await startResponse.json();
          addDebugLog("✅ Classification start successful", {
            session_id: startData.session_id,
            question_id: startData.first_question?.id,
            question_text: startData.first_question?.text?.substring(0, 50) + "...",
            total_departments: startData.total_departments
          });
          
          // All tests passed - start real classification
          setTimeout(() => {
            setSessionId(startData.session_id);
            setCurrentQuestion(startData.first_question);
            setState('questioning');
          }, 2000);
          
        } else {
          const errorData = await startResponse.text();
          addDebugLog("❌ Classification start failed", { 
            status: startResponse.status, 
            error: errorData 
          });
          setState('error');
          setError(`Classification API failed: ${startResponse.status} ${errorData}`);
        }
        
      } else {
        addDebugLog("❌ Health check failed", { status: healthResponse.status });
        setState('offline');
        setError(`Backend health check failed: ${healthResponse.status}`);
      }
      
    } catch (err: any) {
      addDebugLog("❌ Connection failed", { error: err.message });
      if (err.message.includes('fetch')) {
        setState('offline');
        setError('Cannot connect to backend server. Make sure it\'s running on http://localhost:8000');
      } else {
        setState('error');
        setError(`Network error: ${err.message}`);
      }
    }
  };

  const submitAnswer = async () => {
    if (!currentQuestion || selectedAnswer === null || !sessionId) return;
    
    try {
      setIsSubmitting(true);
      addDebugLog(`📝 Submitting answer: Q${questionsAnswered + 1}`, {
        question_id: currentQuestion.id,
        question_stage: currentQuestion.question_stage,
        question_category: currentQuestion.category,
        response: selectedAnswer,
        confidence,
        session_id: sessionId.substring(0, 8) + "..."
      });
      
      const response = await api.submitAnswer(
        sessionId,
        currentQuestion.id,
        selectedAnswer,
        confidence
      );
      
      addDebugLog("📊 Answer response received", {
        has_next_question: !!response.next_question,
        next_question_id: response.next_question?.id,
        next_question_stage: response.next_question?.question_stage,
        next_question_category: response.next_question?.category,
        is_complete: response.classification_result.is_complete,
        should_continue: response.classification_result.should_continue,
        questions_asked: response.classification_result.questions_asked,
        top_department: response.classification_result.top_department,
        top_probability: response.classification_result.top_probability,
        secondary_department: response.classification_result.secondary_department,
        secondary_probability: response.classification_result.secondary_probability
      });
      
      setQuestionsAnswered(response.classification_result.questions_asked);
      
      // Enhanced completion logic
      const isComplete = response.classification_result.is_complete;
      const shouldContinue = response.classification_result.should_continue;
      const hasNextQuestion = !!response.next_question;
      const questionsCount = response.classification_result.questions_asked;
      
      addDebugLog("🔍 Decision logic", {
        isComplete,
        shouldContinue,
        hasNextQuestion,
        questionsCount,
        maxQuestionsReached: questionsCount >= 15
      });
      
      if (isComplete || !shouldContinue || questionsCount >= 15) {
        addDebugLog("🎯 Classification complete!", {
          reason: isComplete ? "is_complete=true" : 
                  !shouldContinue ? "should_continue=false" :
                  "max_questions_reached",
          final_department: response.classification_result.top_department,
          confidence: response.classification_result.top_probability,
          questions_asked: response.classification_result.questions_asked,
          secondary_match: response.classification_result.secondary_department
        });
        
        setState('processing');
        setResult(response.classification_result);
        await getExplanation(response.classification_result);
        
      } else if (hasNextQuestion) {
        addDebugLog("➡️ Next question loaded", {
          question_id: response.next_question.id,
          category: response.next_question.category,
          stage: response.next_question.question_stage,
          primary_trait: response.next_question.primary_trait,
          information_value: response.next_question.information_value,
          target_departments: response.next_question.target_departments
        });
        
        // Check if question is actually different from current
        if (response.next_question.id === currentQuestion.id) {
          addDebugLog("⚠️ Same question returned - possible backend issue");
        }
        
        setCurrentQuestion(response.next_question);
        setSelectedAnswer(null);
        setConfidence(1.0);
        
      } else {
        addDebugLog("⚠️ Unexpected response state - forcing completion", {
          response_structure: Object.keys(response),
          classification_keys: Object.keys(response.classification_result)
        });
        // Force completion
        setState('processing');
        setResult(response.classification_result);
        await getExplanation(response.classification_result);
      }
      
    } catch (err: any) {
      addDebugLog("❌ Submit answer failed", { 
        error: err.message,
        status: err.status,
        full_error: err
      });
      setError(err.message || 'Failed to submit answer');
      setState('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getExplanation = async (classificationResult: ClassificationResult) => {
    try {
      addDebugLog("📝 Getting explanation...", { department: classificationResult.top_department });
      
      const explanationResponse = await api.getExplanation(sessionId, undefined, true);
      addDebugLog("✅ Explanation received", { method: explanationResponse.generation_method });
      
      setExplanation(explanationResponse);
      setState('complete');
      onComplete?.(classificationResult, explanationResponse);
      
    } catch (err: any) {
      addDebugLog("⚠️ Explanation failed, showing results anyway", { error: err.message });
      setState('complete');
      setError(`Results ready! (${err.message || 'Explanation unavailable'})`);
    }
  };

  const restartQuiz = () => {
    setSessionId('');
    setCurrentQuestion(null);
    setSelectedAnswer(null);
    setConfidence(1.0);
    setResult(null);
    setExplanation(null);
    setError('');
    setQuestionsAnswered(0);
    setDebugInfo([]);
    debugBackendConnection();
  };

  // Debug state - show connection testing
  if (state === 'debug') {
    return (
      <div className="relative min-h-screen w-full bg-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Waves lineColor="rgba(255, 130, 0, 0.3)" backgroundColor="#F1ECE4" mouseInteraction={false} />
        </div>
        
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <Server className="w-16 h-16 text-[#FF8200] mx-auto mb-4 animate-pulse" />
              <h1 className="text-4xl font-bold text-gray-800 mb-2">Testing Backend Connection</h1>
              <p className="text-gray-600">Verifying Bayesian classification system...</p>
            </div>
            
            <div className="bg-black/90 text-green-400 p-6 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
              {debugInfo.map((log, index) => (
                <div key={index} className="mb-2">
                  <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                  {log.data && (
                    <pre className="text-gray-300 ml-4 text-xs">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
              {debugInfo.length === 0 && (
                <div className="animate-pulse">Initializing connection test...</div>
              )}
            </div>
            
            <div className="text-center mt-6">
              <button
                onClick={debugBackendConnection}
                className="bg-[#FF8200] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#E67500] transition-colors"
              >
                Retry Connection Test
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Offline state - backend not running
  if (state === 'offline') {
    return (
      <div className="relative min-h-screen w-full bg-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Waves lineColor="rgba(255, 130, 0, 0.3)" backgroundColor="#F1ECE4" mouseInteraction={false} />
        </div>
        
        <div className="relative z-10 flex flex-col items-center justify-center h-screen text-center p-8">
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8 max-w-lg">
            <Wifi className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-800 mb-4">Backend Server Offline</h2>
            <p className="text-red-600 mb-6">{error}</p>
            
            <div className="text-left bg-gray-100 p-4 rounded mb-6 text-sm">
              <p className="font-semibold mb-2">To start the backend:</p>
              <ol className="list-decimal list-inside space-y-1 text-gray-700">
                <li>Open terminal in <code className="bg-white px-1">backend/</code> folder</li>
                <li>Run: <code className="bg-white px-1">python run.py</code></li>
                <li>Wait for: <em>"🎯 Taqneeq Department Classifier ready!"</em></li>
                <li>Then click "Test Connection" below</li>
              </ol>
            </div>
            
            <div className="flex gap-3 justify-center">
              <button
                onClick={debugBackendConnection}
                className="bg-[#FF8200] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#E67500] transition-colors"
              >
                Test Connection
              </button>
              <button
                onClick={() => window.open('http://localhost:8000', '_blank')}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Check Backend
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (state === 'loading') {
    return (
      <div className="relative min-h-screen w-full bg-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Waves lineColor="rgba(255, 130, 0, 0.3)" backgroundColor="#F1ECE4" mouseInteraction={false} />
        </div>
        
        <div className="relative z-10 flex flex-col items-center justify-center h-screen text-center p-8">
          <Loader2 className="w-12 h-12 animate-spin text-[#FF8200] mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Initializing Bayesian AI</h2>
          <p className="text-gray-600">Loading adaptive classification system...</p>
        </div>
      </div>
    );
  }

  // Processing state
  if (state === 'processing') {
    return (
      <div className="relative min-h-screen w-full bg-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Waves lineColor="rgba(255, 130, 0, 0.4)" backgroundColor="#F1ECE4" mouseInteraction={false} />
        </div>
        
        <div className="relative z-10 flex flex-col items-center justify-center h-screen text-center p-8">
          <Brain className="w-16 h-16 text-[#FF8200] mb-4 animate-pulse" />
          <h2 className="text-3xl font-bold text-gray-800 mb-4">AI Processing Complete!</h2>
          <p className="text-lg text-gray-600 mb-4">
            Analyzed {questionsAnswered} responses with Bayesian inference
          </p>
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Generating personalized explanation...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <div className="relative min-h-screen w-full bg-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Waves lineColor="rgba(255, 130, 0, 0.3)" backgroundColor="#F1ECE4" mouseInteraction={false} />
        </div>
        
        <div className="relative z-10 flex flex-col items-center justify-center h-screen text-center p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-lg">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-red-800 mb-2">Classification Error</h2>
            <p className="text-red-600 mb-4">{error}</p>
            
            <div className="flex gap-3 justify-center">
              <button
                onClick={restartQuiz}
                className="bg-[#FF8200] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#E67500] transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={debugBackendConnection}
                className="bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
              >
                Debug Connection
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Results state
  if (state === 'complete' && result) {
    return (
      <div className="relative min-h-screen w-full bg-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Waves lineColor="rgba(255, 130, 0, 0.4)" backgroundColor="#F1ECE4" mouseInteraction={true} />
        </div>
        
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center p-8">
          <div className="max-w-4xl mx-auto">
            {/* Success Header */}
            <div className="mb-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-4xl md:text-6xl font-bold text-[#FF8200] mb-4">
                Perfect Match Found!
              </h1>
              <div className="flex items-center justify-center gap-2 text-lg text-gray-600">
                <Brain className="w-5 h-5" />
                <span>Bayesian AI analyzed {questionsAnswered} responses</span>
              </div>
            </div>

            {/* Main Result */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 mb-6">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                {getDepartmentDisplayName(result.top_department)}
              </h2>
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full font-semibold">
                  {(result.top_probability * 100).toFixed(1)}% match
                </div>
                <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-semibold">
                  {result.confidence_level} confidence
                </div>
              </div>
              <p className="text-gray-600 text-lg">{result.reasoning}</p>
              
              {/* Debug info - remove after testing */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 p-3 bg-gray-100 text-xs rounded">
                  <strong>Debug:</strong> 
                  Secondary: {result.secondary_department || 'null'} | 
                  Probability: {result.secondary_probability || 'null'}
                </div>
              )}
              
              {/* Secondary/Fallback Department */}
              {result.secondary_department && result.secondary_probability && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Second Best Match:</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-800 font-medium">
                      {getDepartmentDisplayName(result.secondary_department)}
                    </span>
                    <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-semibold">
                      {(result.secondary_probability * 100).toFixed(1)}% match
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Another strong option based on your profile
                  </p>
                </div>
              )}
            </div>

            {/* Your Top Traits */}
            {result.current_top_traits && result.current_top_traits.length > 0 && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 mb-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-2">
                  <Users className="w-6 h-6" />
                  Your Top Traits
                </h3>
                <div className="flex flex-wrap justify-center gap-3">
                  {result.current_top_traits.slice(0, 5).map(([trait, score], index) => (
                    <div key={index} className="bg-gradient-to-r from-[#FF8200] to-[#E67500] text-white px-4 py-2 rounded-full font-semibold">
                      {trait} ({(score * 100).toFixed(0)}%)
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Explanation */}
            {explanation && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 mb-6 text-left">
                <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                  Why This Department is Perfect for You
                </h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-bold text-lg text-gray-800 mb-2">Overview</h4>
                    <p className="text-gray-600 mb-4">{explanation.explanation.overview}</p>
                    
                    <h4 className="font-bold text-lg text-gray-800 mb-2">Why You're a Good Fit</h4>
                    <p className="text-gray-600">{explanation.explanation.why_good_fit}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-bold text-lg text-gray-800 mb-2">What You'll Do</h4>
                    <p className="text-gray-600 mb-4">{explanation.explanation.responsibilities}</p>
                    
                    <h4 className="font-bold text-lg text-gray-800 mb-2">Skills You'll Gain</h4>
                    <p className="text-gray-600">{explanation.explanation.skills_gained}</p>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-bold text-lg text-gray-800 mb-2">Next Steps</h4>
                  <p className="text-gray-600">{explanation.explanation.next_steps}</p>
                </div>
              </div>
            )}

            {/* Error message if explanation failed */}
            {!explanation && error && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-yellow-800">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  {error}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={restartQuiz}
                className="bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
              >
                Take Quiz Again
              </button>
              <button
                onClick={() => window.location.href = '/departments'}
                className="bg-[#FF8200] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#E67500] transition-colors flex items-center gap-2 justify-center"
              >
                Explore All Departments <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Questioning state
  if (state === 'questioning' && currentQuestion) {
    return (
      <div className="relative min-h-screen w-full bg-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Waves lineColor="rgba(255, 130, 0, 0.4)" backgroundColor="#F1ECE4" mouseInteraction={false} />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center p-8">
          {/* Progress Bar */}
          <div className="w-full max-w-2xl mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">AI Adaptive Questions</span>
              <span className="text-sm text-gray-600">{questionsAnswered} answered</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-[#FF8200] h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min((questionsAnswered / totalQuestions) * 100, 90)}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-8 text-[#FF8200]">
              Bayesian Department Matching
            </h1>

            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 mb-8">
              <p className="text-xl md:text-2xl text-gray-800 font-semibold mb-8">
                {currentQuestion.text}
              </p>

              {/* Likert Scale Options */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                {[1, 2, 3, 4, 5].map((option) => (
                  <button
                    key={option}
                    onClick={() => setSelectedAnswer(option)}
                    className={`w-full sm:w-auto px-6 py-3 rounded-lg border-2 transition-all duration-300 font-semibold ${
                      selectedAnswer === option
                        ? 'bg-[#FF8200] text-white border-[#FF8200] transform scale-105'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-[#FF8200] hover:bg-[#FF8200]/10'
                    }`}
                  >
                    <div className="text-lg">{option}</div>
                    <div className="text-xs opacity-80">
                      {['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'][option - 1]}
                    </div>
                  </button>
                ))}
              </div>

              {/* Confidence Slider */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Response Confidence: {(confidence * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={confidence}
                  onChange={(e) => setConfidence(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #FF8200 0%, #FF8200 ${confidence * 100}%, #e5e7eb ${confidence * 100}%, #e5e7eb 100%)`
                  }}
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={submitAnswer}
                disabled={selectedAnswer === null || isSubmitting}
                className="bg-[#FF8200] text-white px-12 py-4 rounded-lg font-semibold text-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#E67500] hover:transform hover:scale-105 flex items-center gap-2 mx-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing with AI...
                  </>
                ) : (
                  <>
                    Submit Answer
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>

            {/* Question Debug Info */}
            <div className="text-sm text-gray-500 bg-gray-100 p-3 rounded mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Question Analysis:</strong>
                  <br />• ID: {currentQuestion.id}
                  <br />• Category: {currentQuestion.category}
                  <br />• Stage: {currentQuestion.question_stage}
                  <br />• Primary Trait: {currentQuestion.primary_trait.replace('_', ' ')}
                </div>
                <div>
                  <strong>AI Targeting:</strong>
                  <br />• Info Value: {currentQuestion.information_value}
                  <br />• Secondary Traits: {currentQuestion.secondary_traits?.length || 0}
                  <br />• Target Depts: {currentQuestion.target_departments?.length || 0}
                  <br />• Answered: {questionsAnswered} / ~12
                </div>
              </div>
              {currentQuestion.question_stage === 'seed' && (
                <div className="mt-2 p-2 bg-blue-50 rounded">
                  <span className="text-blue-700 font-medium">🌱 Seed Question:</span> Building your trait profile foundation
                </div>
              )}
              {currentQuestion.question_stage === 'adaptive' && (
                <div className="mt-2 p-2 bg-orange-50 rounded">
                  <span className="text-orange-700 font-medium">🧠 Adaptive Question:</span> Selected by Bayesian AI based on your responses
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}