export interface QuizQuestion {
  question: string;
  options: [string, string, string];
}

export const quizQuestions: QuizQuestion[] = [
  {
    question: 'What would you rather post on Instagram?',
    options: ['Fashion girlie', 'Educational content', 'Literally nothing'],
  },
  {
    question: 'Choose a hobby:',
    options: ['Painting', 'Coding', 'Reading a book'],
  },
  {
    question: 'What\'s your go-to movie genre?',
    options: ['Documentary', 'Sci-Fi', 'Comedy'],
  },
  // Add more questions here
];