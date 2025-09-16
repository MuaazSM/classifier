'use client';
import { useState } from 'react';
import Waves from '../../components/Waves'; // Adjust path if needed
import { quizQuestions } from '@/data/quiz'; // Import quiz data

export default function ClassifyVoicePage() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleNextQuestion = () => {
    if (selectedOption) {
      // Logic to store the answer would go here
      console.log(`Question ${currentQuestionIndex + 1}: Selected "${selectedOption}"`);
      
      // Move to the next question
      setCurrentQuestionIndex((prevIndex) => (prevIndex + 1) % quizQuestions.length);
      setSelectedOption(null); // Reset selection
    }
  };

  const currentQuestion = quizQuestions[currentQuestionIndex];

  return (
    <div className="relative min-h-screen w-full bg-white overflow-hidden">
      {/* Background using the Waves component */}
      <div className="absolute inset-0 z-0">
        <Waves
          lineColor="rgba(255, 130, 0, 0.4)"
          backgroundColor="#F1ECE4"
          mouseInteraction={false} // Static background
          waveAmpX={30}
          waveAmpY={15}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-screen text-center p-8">
        <h1 className="text-6xl font-bold mb-8" style={{ color: '#FF8200' }}>
          FIND YOUR DEPARTMENT NOW.
        </h1>

        <p className="text-2xl text-gray-800 font-semibold mb-10">
          {currentQuestion.question}
        </p>

        {/* Answer Options */}
        <div className="flex items-center justify-center gap-x-6 mb-12">
          {currentQuestion.options.map((option) => (
            <button
              key={option}
              onClick={() => setSelectedOption(option)}
              className={`px-8 py-3 rounded-full text-lg border transition-colors duration-300
                ${
                  selectedOption === option
                    ? 'bg-black text-white border-black'
                    : 'bg-transparent text-gray-700 border-gray-400 hover:bg-gray-100'
                }`}
            >
              {option}
            </button>
          ))}
        </div>

        {/* Next Button */}
        <button
          onClick={handleNextQuestion}
          disabled={!selectedOption}
          className="bg-[#FF8200] text-white px-10 py-4 rounded-lg font-semibold text-xl transition-opacity duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#E67500]"
        >
          Next question
        </button>
      </div>
    </div>
  );
}