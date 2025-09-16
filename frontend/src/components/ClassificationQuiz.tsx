// frontend/src/components/ClassificationQuiz.tsx - Fixed results rendering
'use client';
import { useState, useEffect } from 'react';
import { api, Question, ClassificationResult, ExplanationResponse } from '@/lib/api';
import Waves from './Waves';
import { Loader2, CheckCircle, ArrowRight, Brain, Users, AlertCircle } from 'lucide-react';

interface ClassificationQuizProps {
  onComplete?: (result: ClassificationResult, explanation: ExplanationResponse) => void;
}

type QuizState = 'loading' | 'questioning' | 'processing' | 'complete' | 'error';

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
  
  // Progress tracking
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [totalQuestions] = useState(10); // Updated to reflect 8-12 range

  // Initialize classification session
  useEffect(() => {
    startClassification();
  }, []);

  const startClassification = async () => {
    try {
      setState('loading');
      setError('');
      
      const response = await api.startClassification();
      setSessionId(response.session_id);
      setCurrentQuestion(response.first_question);
      setState('questioning');
      
      console.log('Classification started:', response);
    } catch (err: any) {
      setError(err.message || 'Failed to start classification');
      setState('error');
      console.error('Start classification error:', err);
    }
  };

  const submitAnswer = async () => {
    if (!currentQuestion || selectedAnswer === null || !sessionId) return;
    
    try {
      setIsSubmitting(true);
      console.log('Submitting answer:', {
        sessionId,
        questionId: currentQuestion.id,
        response: selectedAnswer,
        confidence
      });
      
      const response = await api.submitAnswer(
        sessionId,
        currentQuestion.id,
        selectedAnswer,
        confidence
      );
      
      console.log('Answer response:', response);
      setQuestionsAnswered(prev => prev + 1);
      
      // Check if classification is complete
      if (response.classification_result.is_complete) {
        console.log('Classification complete, getting explanation...');
        setState('processing');
        setResult(response.classification_result);
        await getExplanation(response.classification_result);
      } else if (response.next_question) {
        // More questions to go
        console.log('Next question:', response.next_question);
        setCurrentQuestion(response.next_question);
        setSelectedAnswer(null);
        setConfidence(1.0);
      } else {
        // This shouldn't happen, but handle gracefully
        console.error('No next question but classification not complete');
        setError('Unexpected response from server');
        setState('error');
      }
    } catch (err: any) {
      console.error('Submit answer error:', err);
      setError(err.message || 'Failed to submit answer');
      setState('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getExplanation = async (classificationResult: ClassificationResult) => {
    try {
      console.log('Getting explanation for result:', classificationResult);
      
      const explanationResponse = await api.getExplanation(sessionId, undefined, true);
      console.log('Explanation response:', explanationResponse);
      
      setExplanation(explanationResponse);
      setState('complete');
      
      // Call completion callback if provided
      onComplete?.(classificationResult, explanationResponse);
    } catch (err: any) {
      console.error('Get explanation error:', err);
      // Even if explanation fails, we have the result
      setState('complete');
      setError(`Classification complete, but explanation failed: ${err.message}`);
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
    setState('loading');
    startClassification();
  };

  const getScaleLabel = (value: number): string => {
    switch (value) {
      case 1: return 'Strongly Disagree';
      case 2: return 'Disagree';
      case 3: return 'Neutral';
      case 4: return 'Agree';
      case 5: return 'Strongly Agree';
      default: return '';
    }
  };

  const getProgressPercentage = (): number => {
    if (state === 'complete') return 100;
    if (state === 'processing') return 95;
    return Math.min((questionsAnswered / totalQuestions) * 100, 90);
  };

  // Render loading state
  if (state === 'loading') {
    return (
      <div className="relative min-h-screen w-full bg-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Waves
            lineColor="rgba(255, 130, 0, 0.3)"
            backgroundColor="#F1ECE4"
            mouseInteraction={false}
            waveAmpX={20}
            waveAmpY={10}
          />
        </div>
        
        <div className="relative z-10 flex flex-col items-center justify-center h-screen text-center p-8">
          <Loader2 className="w-12 h-12 animate-spin text-[#FF8200] mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Initializing Your Department Classifier
          </h2>
          <p className="text-gray-600">
            Setting up personalized questions just for you...
          </p>
        </div>
      </div>
    );
  }

  // Render processing state
  if (state === 'processing') {
    return (
      <div className="relative min-h-screen w-full bg-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Waves
            lineColor="rgba(255, 130, 0, 0.4)"
            backgroundColor="#F1ECE4"
            mouseInteraction={false}
            waveAmpX={25}
            waveAmpY={12}
          />
        </div>
        
        <div className="relative z-10 flex flex-col items-center justify-center h-screen text-center p-8">
          <Brain className="w-16 h-16 text-[#FF8200] mb-4 animate-pulse" />
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Analyzing Your Perfect Match
          </h2>
          <p className="text-lg text-gray-600 mb-4">
            Processing your {questionsAnswered} responses to find your ideal department...
          </p>
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Generating personalized explanation</span>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (state === 'error') {
    return (
      <div className="relative min-h-screen w-full bg-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Waves
            lineColor="rgba(255, 130, 0, 0.3)"
            backgroundColor="#F1ECE4"
            mouseInteraction={false}
            waveAmpX={15}
            waveAmpY={8}
          />
        </div>
        
        <div className="relative z-10 flex flex-col items-center justify-center h-screen text-center p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-red-800 mb-2">
              Something went wrong
            </h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={restartQuiz}
              className="bg-[#FF8200] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#E67500] transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render results state
  if (state === 'complete' && result) {
    return (
      <div className="relative min-h-screen w-full bg-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Waves
            lineColor="rgba(255, 130, 0, 0.4)"
            backgroundColor="#F1ECE4"
            mouseInteraction={true}
            waveAmpX={25}
            waveAmpY={12}
          />
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
                <span>Based on {questionsAnswered} questions answered</span>
              </div>
            </div>

            {/* Main Result */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 mb-6">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                {result.top_department.replace(/_/g, ' ').toUpperCase()}
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
            </div>

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

            {/* Show error if explanation failed but still show other data */}
            {!explanation && error && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-yellow-800">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Could not load detailed explanation, but your classification is complete!
                </p>
              </div>
            )}

            {/* Your Top Traits */}
            {result.current_top_traits.length > 0 && (
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

            {/* Alternative Departments */}
            {explanation?.alternative_departments && explanation.alternative_departments.length > 0 && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 mb-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Other Good Matches</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {explanation.alternative_departments.map((dept, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-bold text-gray-800">{dept.name}</h4>
                      <p className="text-sm text-gray-600 mb-2">{dept.description}</p>
                      <div className="text-sm font-semibold text-[#FF8200]">
                        {(dept.probability * 100).toFixed(1)}% match
                      </div>
                    </div>
                  ))}
                </div>
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

  // Render questioning state
  if (state === 'questioning' && currentQuestion) {
    return (
      <div className="relative min-h-screen w-full bg-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Waves
            lineColor="rgba(255, 130, 0, 0.4)"
            backgroundColor="#F1ECE4"
            mouseInteraction={false}
            waveAmpX={30}
            waveAmpY={15}
          />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center p-8">
          {/* Progress Bar */}
          <div className="w-full max-w-2xl mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Progress</span>
              <span className="text-sm text-gray-600">{questionsAnswered} / ~{totalQuestions}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-[#FF8200] h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-8 text-[#FF8200]">
              Find Your Perfect Department
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
                    <div className="text-xs opacity-80">{getScaleLabel(option)}</div>
                  </button>
                ))}
              </div>

              {/* Confidence Slider */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How confident are you in this answer? ({(confidence * 100).toFixed(0)}%)
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
                    Processing...
                  </>
                ) : (
                  <>
                    Next Question
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>

            {/* Question Metadata */}
            <div className="text-sm text-gray-500">
              Category: {currentQuestion.category} • 
              Primary trait: {currentQuestion.primary_trait.replace('_', ' ')}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}