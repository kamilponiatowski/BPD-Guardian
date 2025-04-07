/**
 * Quiz Component
 * Handles quiz functionality, rendering, and tracking results
 * 
 * @module components/quiz
 */

import { t } from '../modules/i18n.js';

export class Quiz {
  /**
   * Create a new Quiz instance
   * 
   * @param {Object} stateManager - The application state manager
   */
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.currentQuiz = null;
    this.currentQuestion = 0;
    this.userAnswers = [];
    
    // Initialize quiz
    this.init();
  }
  
  /**
   * Initialize quiz events and state
   */
  init() {
    // Listen for state changes
    this.stateManager.subscribe('currentQuiz', (quiz) => {
      if (quiz) {
        this.currentQuiz = quiz;
        this.renderQuiz();
      }
    });
    
    this.stateManager.subscribe('currentQuizQuestion', (questionIndex) => {
      this.currentQuestion = questionIndex;
      this.renderQuestion();
    });
    
    this.stateManager.subscribe('quizAnswers', (answers) => {
      this.userAnswers = answers || [];
    });
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  /**
   * Set up event listeners for quiz navigation
   */
  setupEventListeners() {
    // Previous question button
    const prevButton = document.querySelector('.quiz__prev');
    if (prevButton) {
      prevButton.addEventListener('click', () => {
        this.navigateToPreviousQuestion();
      });
    }
    
    // Next question button
    const nextButton = document.querySelector('.quiz__next');
    if (nextButton) {
      nextButton.addEventListener('click', () => {
        this.navigateToNextQuestion();
      });
    }
    
    // Finish quiz button
    const finishButton = document.querySelector('.quiz__finish');
    if (finishButton) {
      finishButton.addEventListener('click', () => {
        this.finishQuiz();
      });
    }
    
    // Quiz results buttons
    const retryButton = document.querySelector('.quiz-results__retry');
    if (retryButton) {
      retryButton.addEventListener('click', () => {
        this.retryQuiz();
      });
    }
    
    const continueButton = document.querySelector('.quiz-results__continue');
    if (continueButton) {
      continueButton.addEventListener('click', () => {
        this.stateManager.setState('currentPage', 'modules');
      });
    }
  }
  
  /**
   * Render the quiz
   */
  renderQuiz() {
    if (!this.currentQuiz) return;
    
    // Update quiz title
    const quizTitle = document.querySelector('.quiz__title');
    if (quizTitle) {
      quizTitle.textContent = this.currentQuiz.title;
    }
    
    // Reset user answers if starting fresh
    const currentAnswers = this.stateManager.getState('quizAnswers');
    if (!currentAnswers || currentAnswers.length === 0) {
      this.userAnswers = new Array(this.currentQuiz.questions.length).fill(null);
      this.stateManager.setState('quizAnswers', this.userAnswers);
    }
    
    // Reset current question if needed
    if (this.currentQuestion >= this.currentQuiz.questions.length) {
      this.stateManager.setState('currentQuizQuestion', 0);
    }
    
    // Render first question
    this.renderQuestion();
    
    // Show quiz container, hide results
    document.querySelector('.quiz-container').style.display = 'block';
    document.querySelector('.quiz-results').style.display = 'none';
  }
  
  /**
   * Render the current question
   */
  renderQuestion() {
    if (!this.currentQuiz || !this.currentQuiz.questions) return;
    
    const questions = this.currentQuiz.questions;
    if (this.currentQuestion < 0 || this.currentQuestion >= questions.length) return;
    
    const question = questions[this.currentQuestion];
    const quizContent = document.getElementById('quiz-content');
    
    if (!quizContent) return;
    
    // Update progress bar
    const progressBar = document.querySelector('.quiz__progress-bar');
    if (progressBar) {
      const progress = ((this.currentQuestion + 1) / questions.length) * 100;
      progressBar.style.width = `${progress}%`;
      
      // Update aria-label for accessibility
      const progressContainer = progressBar.closest('.quiz__progress');
      if (progressContainer) {
        progressContainer.setAttribute('aria-label', `Postęp quizu: ${Math.round(progress)}%`);
      }
    }
    
    // Create question element
    quizContent.innerHTML = '';
    
    const questionElement = document.createElement('div');
    questionElement.className = 'quiz__question';
    
    // Question number
    const questionNumber = document.createElement('div');
    questionNumber.className = 'quiz__question-number';
    questionNumber.textContent = `Pytanie ${this.currentQuestion + 1} z ${questions.length}`;
    
    // Question text
    const questionText = document.createElement('div');
    questionText.className = 'quiz__question-text';
    questionText.textContent = question.text;
    
    // Options
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'quiz__options';
    
    question.options.forEach(option => {
      const optionElement = document.createElement('div');
      optionElement.className = 'quiz__option';
      
      // Determine if this option is selected
      const isSelected = this.userAnswers[this.currentQuestion] && 
        (Array.isArray(this.userAnswers[this.currentQuestion]) 
          ? this.userAnswers[this.currentQuestion].includes(option.id)
          : this.userAnswers[this.currentQuestion] === option.id);
      
      if (isSelected) {
        optionElement.classList.add('quiz__option--selected');
      }
      
      // Input (checkbox or radio)
      const input = document.createElement('input');
      input.type = question.type === 'multiple' ? 'checkbox' : 'radio';
      input.className = 'quiz__option-input';
      input.name = 'quiz-answer';
      input.value = option.id;
      input.id = `option-${option.id}`;
      input.checked = isSelected;
      
      // Label with marker and text
      const label = document.createElement('label');
      label.className = 'quiz__option-label';
      label.htmlFor = `option-${option.id}`;
      
      const marker = document.createElement('span');
      marker.className = 'quiz__option-marker';
      marker.textContent = option.id.toUpperCase();
      
      const text = document.createElement('span');
      text.className = 'quiz__option-text';
      text.textContent = option.text;
      
      // Assemble option
      label.appendChild(marker);
      label.appendChild(text);
      optionElement.appendChild(input);
      optionElement.appendChild(label);
      
      // Add click handler for the entire option div
      optionElement.addEventListener('click', () => {
        input.checked = !input.checked;
        this.updateSelectedOption(option.id, input.checked, question.type === 'multiple');
      });
      
      // Add change handler for the input
      input.addEventListener('change', (e) => {
        this.updateSelectedOption(option.id, e.target.checked, question.type === 'multiple');
      });
      
      optionsContainer.appendChild(optionElement);
    });
    
    // Assemble question
    questionElement.appendChild(questionNumber);
    questionElement.appendChild(questionText);
    questionElement.appendChild(optionsContainer);
    quizContent.appendChild(questionElement);
    
    // Update navigation buttons
    const prevButton = document.querySelector('.quiz__prev');
    const nextButton = document.querySelector('.quiz__next');
    const finishButton = document.querySelector('.quiz__finish');
    
    if (prevButton) {
      prevButton.disabled = this.currentQuestion === 0;
    }
    
    if (nextButton) {
      nextButton.style.display = this.currentQuestion < questions.length - 1 ? 'inline-block' : 'none';
    }
    
    if (finishButton) {
      finishButton.style.display = this.currentQuestion === questions.length - 1 ? 'inline-block' : 'none';
    }
  }
  
  /**
   * Update the selected option for the current question
   * 
   * @param {string} optionId - Option identifier
   * @param {boolean} selected - Whether the option is selected
   * @param {boolean} multiple - Whether multiple options can be selected
   */
  updateSelectedOption(optionId, selected, multiple) {
    let answers = [...this.userAnswers];
    
    if (!answers[this.currentQuestion]) {
      answers[this.currentQuestion] = multiple ? [] : null;
    }
    
    if (multiple) {
      // For multiple choice, toggle the option in the array
      if (selected) {
        if (!answers[this.currentQuestion].includes(optionId)) {
          answers[this.currentQuestion] = [...answers[this.currentQuestion], optionId];
        }
      } else {
        answers[this.currentQuestion] = answers[this.currentQuestion].filter(id => id !== optionId);
      }
    } else {
      // For single choice, set the option
      answers[this.currentQuestion] = selected ? optionId : null;
      
      // Update UI to reflect single choice
      document.querySelectorAll('.quiz__option').forEach(option => {
        option.classList.remove('quiz__option--selected');
      });
      
      if (selected) {
        const selectedOption = document.querySelector(`.quiz__option input[value="${optionId}"]`).closest('.quiz__option');
        selectedOption.classList.add('quiz__option--selected');
      }
    }
    
    // Update state
    this.stateManager.setState('quizAnswers', answers);
    
    // Update UI
    document.querySelectorAll('.quiz__option input').forEach(input => {
      const optionElement = input.closest('.quiz__option');
      if (input.checked) {
        optionElement.classList.add('quiz__option--selected');
      } else {
        optionElement.classList.remove('quiz__option--selected');
      }
    });
  }
  
  /**
   * Navigate to the previous question
   */
  navigateToPreviousQuestion() {
    if (this.currentQuestion <= 0) return;
    
    this.stateManager.setState('currentQuizQuestion', this.currentQuestion - 1);
  }
  
  /**
   * Navigate to the next question
   */
  navigateToNextQuestion() {
    const selectedAnswers = document.querySelectorAll('input[name="quiz-answer"]:checked');
    
    if (selectedAnswers.length === 0) {
      // No answer selected, show notification
      this.stateManager.addNotification({
        type: 'error',
        message: t('quiz.noAnswerSelected'),
        icon: '⚠️'
      });
      return;
    }
    
    // Save current answers
    let answers = [...this.userAnswers];
    const isMultiple = this.currentQuiz.questions[this.currentQuestion].type === 'multiple';
    
    if (isMultiple) {
      // Multiple choice - collect all selected options
      answers[this.currentQuestion] = Array.from(selectedAnswers).map(input => input.value);
    } else {
      // Single choice - just take the first selected
      answers[this.currentQuestion] = selectedAnswers[0].value;
    }
    
    this.stateManager.setState('quizAnswers', answers);
    
    // Navigate to next question if not last
    if (this.currentQuestion < this.currentQuiz.questions.length - 1) {
      this.stateManager.setState('currentQuizQuestion', this.currentQuestion + 1);
    }
  }
  
  /**
   * Finish the quiz and show results
   */
  finishQuiz() {
    // Ensure an answer is selected for the last question
    const selectedAnswers = document.querySelectorAll('input[name="quiz-answer"]:checked');
    
    if (selectedAnswers.length === 0) {
      // No answer selected, show notification
      this.stateManager.addNotification({
        type: 'error',
        message: t('quiz.noAnswerSelected'),
        icon: '⚠️'
      });
      return;
    }
    
    // Save last answer
    let answers = [...this.userAnswers];
    const isMultiple = this.currentQuiz.questions[this.currentQuestion].type === 'multiple';
    
    if (isMultiple) {
      answers[this.currentQuestion] = Array.from(selectedAnswers).map(input => input.value);
    } else {
      answers[this.currentQuestion] = selectedAnswers[0].value;
    }
    
    this.stateManager.setState('quizAnswers', answers);
    
    // Calculate results
    const results = this.calculateResults();
    
    // Show results
    this.showResults(results);
    
    // Save results in state
    this.stateManager.saveQuizResults(this.currentQuiz.id, {
      quizId: this.currentQuiz.id,
      score: results.score,
      correctAnswers: results.correctCount,
      totalQuestions: this.currentQuiz.questions.length,
      answers: answers,
      completedAt: new Date().toISOString()
    });
    
    // Check if passing score achieved and update module progress
    const currentModule = this.stateManager.getState('currentModule');
    if (currentModule && results.score >= (this.currentQuiz.passThreshold || 70)) {
      this.stateManager.completeModule(currentModule.id);
      
      // Award points
      this.stateManager.awardPoints(50, t('points.moduleCompleted', { module: currentModule.title }));
      
      // Award points for perfect score
      if (results.score === 100) {
        this.stateManager.awardPoints(30, t('points.perfectQuiz'));
      }
    }
  }
  
  /**
   * Calculate quiz results
   * 
   * @returns {Object} Results object with score, correct/wrong counts
   */
  calculateResults() {
    let correctCount = 0;
    let wrongCount = 0;
    
    this.currentQuiz.questions.forEach((question, index) => {
      const userAnswer = this.userAnswers[index];
      
      if (!userAnswer) {
        wrongCount++;
        return;
      }
      
      if (Array.isArray(question.correctAnswer)) {
        // Multiple choice
        if (Array.isArray(userAnswer) &&
            userAnswer.length === question.correctAnswer.length &&
            question.correctAnswer.every(answer => userAnswer.includes(answer))) {
          correctCount++;
        } else {
          wrongCount++;
        }
      } else {
        // Single choice
        if (userAnswer === question.correctAnswer) {
          correctCount++;
        } else {
          wrongCount++;
        }
      }
    });
    
    const score = Math.round((correctCount / this.currentQuiz.questions.length) * 100);
    
    return {
      score,
      correctCount,
      wrongCount,
      passThreshold: this.currentQuiz.passThreshold || 70,
      passed: score >= (this.currentQuiz.passThreshold || 70)
    };
  }
  
  /**
   * Show quiz results
   * 
   * @param {Object} results - Quiz results object
   */
  showResults(results) {
    // Hide quiz container
    document.querySelector('.quiz-container').style.display = 'none';
    
    // Show results container
    const resultsContainer = document.querySelector('.quiz-results');
    resultsContainer.style.display = 'block';
    
    // Update results content
    const percentage = resultsContainer.querySelector('.quiz-results__percentage');
    if (percentage) {
      percentage.textContent = `${results.score}%`;
    }
    
    const correctAnswers = resultsContainer.querySelector('.quiz-results__correct');
    if (correctAnswers) {
      correctAnswers.textContent = t('quiz.results.correct', {
        correctAnswers: results.correctCount,
        totalQuestions: this.currentQuiz.questions.length
      });
    }
    
    // Add feedback based on score
    const feedback = resultsContainer.querySelector('.quiz-results__feedback');
    if (feedback) {
      feedback.className = 'quiz-results__feedback';
      
      if (results.score >= 90) {
        feedback.textContent = t('quiz.results.excellent');
        feedback.classList.add('quiz-results__feedback--excellent');
      } else if (results.score >= 70) {
        feedback.textContent = t('quiz.results.good');
        feedback.classList.add('quiz-results__feedback--good');
      } else {
        feedback.textContent = t('quiz.results.needsImprovement');
        feedback.classList.add('quiz-results__feedback--needs-improvement');
      }
    }
  }
  
  /**
   * Retry the quiz
   */
  retryQuiz() {
    // Reset user answers
    this.userAnswers = new Array(this.currentQuiz.questions.length).fill(null);
    this.stateManager.setState('quizAnswers', this.userAnswers);
    
    // Reset current question
    this.stateManager.setState('currentQuizQuestion', 0);
    
    // Hide results, show quiz
    document.querySelector('.quiz-results').style.display = 'none';
    document.querySelector('.quiz-container').style.display = 'block';
    
    // Render the first question
    this.renderQuestion();
  }
  
  /**
   * Load a quiz for a module
   * 
   * @param {string} moduleId - Module identifier
   * @returns {Promise} Promise resolving to quiz data
   */
  async loadQuiz(moduleId) {
    try {
      const response = await fetch(`data/quizzes/${moduleId}.json`);
      
      if (!response.ok) {
        throw new Error(`Failed to load quiz for module ${moduleId}`);
      }
      
      const quiz = await response.json();
      return quiz;
    } catch (error) {
      console.error(`Error loading quiz for module ${moduleId}:`, error);
      return null;
    }
  }
  
  /**
   * Start a quiz for a module
   * 
   * @param {string} moduleId - Module identifier
   */
  async startQuiz(moduleId) {
    try {
      // Load quiz data
      const quiz = await this.loadQuiz(moduleId);
      
      if (!quiz) {
        this.stateManager.addNotification({
          type: 'error',
          message: 'Nie udało się załadować quizu. Spróbuj ponownie później.',
          icon: '⚠️'
        });
        return;
      }
      
      // Set current quiz
      this.stateManager.setState('currentQuiz', quiz);
      
      // Reset quiz state
      this.stateManager.setState('currentQuizQuestion', 0);
      this.stateManager.setState('quizAnswers', new Array(quiz.questions.length).fill(null));
      
      // Navigate to quiz page
      this.stateManager.setState('currentPage', 'quiz');
    } catch (error) {
      console.error(`Error starting quiz for module ${moduleId}:`, error);
      this.stateManager.addNotification({
        type: 'error',
        message: 'Wystąpił błąd podczas uruchamiania quizu. Spróbuj ponownie później.',
        icon: '⚠️'
      });
    }
  }
}