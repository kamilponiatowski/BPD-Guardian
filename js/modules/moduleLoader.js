/**
 * Module Loader
 * Handles loading and navigation of educational modules and quizzes
 * 
 * @module moduleLoader
 */

import { t } from './i18n.js';

export class ModuleLoader {
  /**
   * Create a new ModuleLoader instance
   * 
   * @param {Object} stateManager - The application state manager
   */
  constructor(stateManager) {
    this.stateManager = stateManager;
    
    // Register this instance with state manager for access from other modules
    this.stateManager.setModuleLoader(this);
  }
  
  /**
   * Load modules data from server or fallback to default
   * 
   * @returns {Promise} A promise that resolves when modules are loaded
   */
  async loadModulesData() {
    try {
      // Try to fetch modules data from server
      const response = await fetch('data/modules.json');
      
      if (!response.ok) {
        throw new Error('Failed to load modules data');
      }
      
      const modules = await response.json();
      this.stateManager.setState('modules', modules);
      
      return modules;
    } catch (error) {
      console.error('Error loading modules data:', error);
      
      // Fallback to default modules data
      const fallbackModules = this.getDefaultModules();
      this.stateManager.setState('modules', fallbackModules);
      
      return fallbackModules;
    }
  }
  
  /**
   * Load quiz data for a specific module
   * 
   * @param {string} moduleId - Module identifier
   * @returns {Promise} A promise that resolves when quiz is loaded
   */
  async loadQuizData(moduleId) {
    try {
      // Try to fetch quiz data from server
      const response = await fetch(`data/quizzes/${moduleId}.json`);
      
      if (!response.ok) {
        throw new Error(`Failed to load quiz data for module ${moduleId}`);
      }
      
      const quiz = await response.json();
      return quiz;
    } catch (error) {
      console.error(`Error loading quiz data for module ${moduleId}:`, error);
      
      // Fallback to default quiz data
      return this.getDefaultQuiz(moduleId);
    }
  }
  
  /**
   * Open a module and load its content
   * 
   * @param {string} moduleId - Module identifier
   */
  async openModule(moduleId) {
    // Get modules data
    const modules = this.stateManager.getState('modules');
    const module = modules.find(m => m.id === moduleId);
    
    if (!module) {
      console.error(`Module with ID "${moduleId}" not found`);
      return;
    }
    
    // Set current module
    this.stateManager.setState('currentModule', module);
    
    // Set first lesson as current lesson
    if (module.lessons && module.lessons.length > 0) {
      const firstLesson = {
        ...module.lessons[0],
        hasPrevious: false,
        isLastLesson: module.lessons.length === 1
      };
      
      this.stateManager.setState('currentLesson', firstLesson);
    }
    
    // Update module progress if not started yet
    const moduleProgress = this.stateManager.getState(`user.moduleProgress.${moduleId}`);
    if (!moduleProgress) {
      this.stateManager.setState(`user.moduleProgress.${moduleId}`, {
        completed: false,
        progress: 0,
        lessons: {}
      });
    }
  }
  
  /**
   * Navigate to the previous lesson
   */
  navigateToPreviousLesson() {
    const currentModule = this.stateManager.getState('currentModule');
    const currentLesson = this.stateManager.getState('currentLesson');
    
    if (!currentModule || !currentLesson) return;
    
    // Find current lesson index
    const lessons = currentModule.lessons;
    const currentIndex = lessons.findIndex(lesson => lesson.id === currentLesson.id);
    
    if (currentIndex <= 0) return; // Already at the first lesson
    
    // Navigate to previous lesson
    const previousLesson = {
      ...lessons[currentIndex - 1],
      hasPrevious: currentIndex - 1 > 0,
      isLastLesson: false
    };
    
    this.stateManager.setState('currentLesson', previousLesson);
  }
  
  /**
   * Navigate to the next lesson or quiz
   */
  async navigateToNextLesson() {
    const currentModule = this.stateManager.getState('currentModule');
    const currentLesson = this.stateManager.getState('currentLesson');
    
    if (!currentModule || !currentLesson) return;
    
    // Find current lesson index
    const lessons = currentModule.lessons;
    const currentIndex = lessons.findIndex(lesson => lesson.id === currentLesson.id);
    
    if (currentIndex === -1 || currentIndex >= lessons.length - 1) {
      // Last lesson, navigate to quiz
      await this.startQuiz(currentModule.id);
      return;
    }
    
    // Navigate to next lesson
    const nextLesson = {
      ...lessons[currentIndex + 1],
      hasPrevious: true,
      isLastLesson: currentIndex + 1 === lessons.length - 1
    };
    
    this.stateManager.setState('currentLesson', nextLesson);
    
    // Update module progress
    this.updateModuleProgress(currentModule.id);
    
    // Mark current lesson as completed
    this.stateManager.setState(`user.moduleProgress.${currentModule.id}.lessons.${currentLesson.id}`, {
      completed: true,
      completedAt: new Date().toISOString()
    });
    
    // Award points for completing lesson
    this.stateManager.awardPoints(10, t('points.lessonCompleted', { lesson: currentLesson.title }));
  }
  
  /**
   * Start the quiz for a module
   * 
   * @param {string} moduleId - Module identifier
   */
  async startQuiz(moduleId) {
    try {
      // Load quiz data
      const quiz = await this.loadQuizData(moduleId);
      
      // Set current quiz
      this.stateManager.setState('currentQuiz', quiz);
      
      // Reset quiz state
      this.stateManager.setState('currentQuizQuestion', 0);
      this.stateManager.setState('quizAnswers', []);
      
      // Show quiz page
      this.stateManager.setState('currentPage', 'quiz');
      
      // Initial quiz rendering is handled by quiz component
    } catch (error) {
      console.error(`Error starting quiz for module ${moduleId}:`, error);
    }
  }
  
  /**
   * Navigate to the previous quiz question
   */
  navigateToPreviousQuizQuestion() {
    const currentQuestion = this.stateManager.getState('currentQuizQuestion');
    
    if (currentQuestion <= 0) return; // Already at first question
    
    // Navigate to previous question
    this.stateManager.setState('currentQuizQuestion', currentQuestion - 1);
  }
  
  /**
   * Navigate to the next quiz question or finish the quiz
   */
  navigateToNextQuizQuestion() {
    const currentQuiz = this.stateManager.getState('currentQuiz');
    const currentQuestion = this.stateManager.getState('currentQuizQuestion');
    const quizAnswers = this.stateManager.getState('quizAnswers') || [];
    
    if (!currentQuiz) return;
    
    // Get selected answer for current question
    const selectedAnswerElements = document.querySelectorAll('input[name="quiz-answer"]:checked');
    if (selectedAnswerElements.length === 0) {
      // No answer selected, show notification
      this.stateManager.addNotification({
        type: 'error',
        message: t('quiz.noAnswerSelected'),
        icon: '⚠️'
      });
      return;
    }
    
    // Get selected answer value
    const selectedAnswer = Array.from(selectedAnswerElements).map(el => el.value);
    
    // Check if last question
    if (currentQuestion >= currentQuiz.questions.length - 1) {
      // Save last answer
      const updatedAnswers = [...quizAnswers];
      updatedAnswers[currentQuestion] = selectedAnswer;
      this.stateManager.setState('quizAnswers', updatedAnswers);
      
      // Finish quiz
      this.finishQuiz();
      return;
    }
    
    // Save answer and navigate to next question
    const updatedAnswers = [...quizAnswers];
    updatedAnswers[currentQuestion] = selectedAnswer;
    
    this.stateManager.setState('quizAnswers', updatedAnswers);
    this.stateManager.setState('currentQuizQuestion', currentQuestion + 1);
  }
  
  /**
   * Finish the quiz and calculate results
   */
  finishQuiz() {
    const currentQuiz = this.stateManager.getState('currentQuiz');
    const quizAnswers = this.stateManager.getState('quizAnswers') || [];
    const currentModule = this.stateManager.getState('currentModule');
    
    if (!currentQuiz || !currentModule) return;
    
    // Calculate score
    let correctAnswers = 0;
    
    currentQuiz.questions.forEach((question, index) => {
      const userAnswer = quizAnswers[index] || [];
      const correctAnswer = question.correctAnswer;
      
      // Handle single and multiple choice questions
      if (Array.isArray(correctAnswer)) {
        // Multiple choice - all correct answers must be selected and no incorrect ones
        if (userAnswer.length === correctAnswer.length &&
            correctAnswer.every(answer => userAnswer.includes(answer))) {
          correctAnswers++;
        }
      } else {
        // Single choice
        if (userAnswer.length === 1 && userAnswer[0] === correctAnswer) {
          correctAnswers++;
        }
      }
    });
    
    const score = Math.round((correctAnswers / currentQuiz.questions.length) * 100);
    
    // Save quiz results
    const quizResults = {
      quizId: currentQuiz.id,
      moduleId: currentModule.id,
      score,
      correctAnswers,
      totalQuestions: currentQuiz.questions.length,
      answers: quizAnswers,
      completedAt: new Date().toISOString()
    };
    
    this.stateManager.saveQuizResults(currentQuiz.id, quizResults);
    
    // Update UI for quiz results
    this.showQuizResults(quizResults);
    
    // Update module progress
    // If score is above pass threshold, mark module as completed
    if (score >= (currentQuiz.passThreshold || 70)) {
      this.stateManager.completeModule(currentModule.id);
      
      // Award points and badges
      this.stateManager.awardPoints(50, t('points.moduleCompleted', { module: currentModule.title }));
      
      // Award module completion badge
      const moduleBadge = {
        name: t('badges.moduleCompleted', { module: currentModule.title }),
        description: t('badges.moduleCompletedDesc', { module: currentModule.title }),
        icon: '🏆',
        points: 50
      };
      
      this.stateManager.awardBadge(`module-${currentModule.id}-completed`, moduleBadge);
      
      // If all modules are completed, award special badge
      const modules = this.stateManager.getState('modules') || [];
      const completedModules = this.stateManager.getState('user.completedModules') || [];
      
      if (completedModules.length === modules.length) {
        const allModulesBadge = {
          name: t('badges.allModulesCompleted'),
          description: t('badges.allModulesCompletedDesc'),
          icon: '🎓',
          points: 100
        };
        
        this.stateManager.awardBadge('all-modules-completed', allModulesBadge);
      }
    }
  }
  
  /**
   * Show quiz results in the UI
   * 
   * @param {Object} results - Quiz results
   * @private
   */
  showQuizResults(results) {
    // Hide quiz questions
    document.querySelector('.quiz-container').style.display = 'none';
    
    // Show quiz results
    const resultsContainer = document.querySelector('.quiz-results');
    resultsContainer.style.display = 'block';
    
    // Update results data
    const percentage = resultsContainer.querySelector('.quiz-results__percentage');
    if (percentage) {
      percentage.textContent = `${results.score}%`;
    }
    
    const correctAnswers = resultsContainer.querySelector('.quiz-results__correct');
    if (correctAnswers) {
      correctAnswers.textContent = t('quiz.results.correct', {
        correctAnswers: results.correctAnswers,
        totalQuestions: results.totalQuestions
      });
      
      correctAnswers.dataset.correctAnswers = results.correctAnswers;
      correctAnswers.dataset.totalQuestions = results.totalQuestions;
    }
    
    // Add feedback based on score
    const feedback = resultsContainer.querySelector('.quiz-results__feedback');
    if (feedback) {
      if (results.score >= 90) {
        feedback.textContent = t('quiz.results.excellent');
        feedback.className = 'quiz-results__feedback quiz-results__feedback--excellent';
      } else if (results.score >= 70) {
        feedback.textContent = t('quiz.results.good');
        feedback.className = 'quiz-results__feedback quiz-results__feedback--good';
      } else {
        feedback.textContent = t('quiz.results.needsImprovement');
        feedback.className = 'quiz-results__feedback quiz-results__feedback--needs-improvement';
      }
    }
  }
  
  /**
   * Retry the current quiz
   */
  retryQuiz() {
    // Hide quiz results
    document.querySelector('.quiz-results').style.display = 'none';
    
    // Show quiz questions
    document.querySelector('.quiz-container').style.display = 'block';
    
    // Reset quiz state
    this.stateManager.setState('currentQuizQuestion', 0);
    this.stateManager.setState('quizAnswers', []);
  }
  
  /**
   * Update module progress based on completed lessons
   * 
   * @param {string} moduleId - Module identifier
   * @private
   */
  updateModuleProgress(moduleId) {
    const module = this.stateManager.getState('modules').find(m => m.id === moduleId);
    const moduleProgress = this.stateManager.getState(`user.moduleProgress.${moduleId}`) || {};
    const lessonsProgress = moduleProgress.lessons || {};
    
    if (!module) return;
    
    // Count completed lessons
    const completedLessons = Object.values(lessonsProgress).filter(l => l.completed).length;
    
    // Calculate progress percentage (including quiz at the end)
    const totalSteps = module.lessons.length + 1; // Lessons + quiz
    const progressPercentage = Math.round((completedLessons / totalSteps) * 100);
    
    // Update module progress
    this.stateManager.setState(`user.moduleProgress.${moduleId}.progress`, progressPercentage);
  }
  
  /**
   * Get default modules data (fallback)
   * 
   * @returns {Array} Default modules data
   * @private
   */
  getDefaultModules() {
    return [
      {
        id: 'module1',
        title: 'Zrozumienie splittingu',
        description: 'Poznaj mechanizm splittingu i jego wpływ na relacje',
        lessons: [
          {
            id: 'module1-lesson1',
            title: 'Czym jest splitting?',
            content: `
              <p>Splitting to mechanizm obronny, w którym osoba z BPD postrzega ludzi i sytuacje w sposób skrajny – jako całkowicie dobre lub złe, bez odcieni szarości.</p>
              <p>Podczas splittingu może dojść do aktywacji układu nerwowego współczulnego (reakcja "walcz lub uciekaj"), co prowadzi do intensywnych reakcji emocjonalnych.</p>
              <div class="tip">
                <div class="tip__icon">💡</div>
                <div class="tip__content">
                  <p>Splitting to nie świadoma manipulacja - to automatyczny mechanizm obronny, który osoba z BPD stosuje nieświadomie, aby chronić się przed lękiem i bólem emocjonalnym.</p>
                </div>
              </div>
            `
          },
          {
            id: 'module1-lesson2',
            title: 'Jak splitting wpływa na relacje?',
            content: [
              {
                type: 'text',
                content: '<p>Splitting może mieć znaczący wpływ na relacje interpersonalne, szczególnie te bliskie i intymne. Oto główne sposoby, w jakie wpływa on na dynamikę relacji:</p>'
              },
              {
                type: 'example',
                title: 'Przykład wpływu na relację',
                content: `
                  <p>Wyobraź sobie sytuację, w której zapomniałeś odpowiedzieć na wiadomość partnerki przez kilka godzin, ponieważ byłeś zajęty w pracy.</p>
                  <p>W normalnej sytuacji mogłoby to wywołać lekkie rozczarowanie lub frustrację, ale ostatecznie zrozumienie.</p>
                  <p>Jednak w przypadku splittingu, może to zostać zinterpretowane jako dowód, że "nie zależy Ci" lub nawet że "nigdy nie zależało" - co może prowadzić do intensywnej reakcji emocjonalnej, oskarżeń o celowe zaniedbanie, a nawet gróźb zakończenia relacji.</p>
                `
              },
              {
                type: 'table',
                caption: 'Wpływ splittingu na relacje',
                header: ['Aspekt', 'Wpływ'],
                rows: [
                  ['Postrzeganie partnera', 'Partner jest widziany albo jako idealny (idealizacja), albo jako całkowicie zły (dewaluacja), często z nagłymi przejściami między tymi skrajnościami.'],
                  ['Stabilność relacji', 'Relacja może być bardzo intensywna, ale niestabilna, z cyklami zbliżania się i oddalania.'],
                  ['Komunikacja', 'Trudności w prowadzeniu konstruktywnych rozmów, szczególnie w sytuacjach konfliktowych.'],
                  ['Zaufanie', 'Problemy z budowaniem trwałego zaufania z powodu zmiennego postrzegania intencji partnera.'],
                  ['Rozwiązywanie konfliktów', 'Konflikty mogą szybko eskalować i być trudne do rozwiązania w konstruktywny sposób.']
                ]
              },
              {
                type: 'tip',
                icon: '🔑',
                content: '<p>Zrozumienie, że splitting jest mechanizmem obronnym, a nie celowym działaniem, może pomóc w zachowaniu spokoju i empatii podczas trudnych momentów w relacji.</p>'
              }
            ]
          },
          {
            id: 'module1-lesson3',
            title: 'Objawy splittingu',
            content: [
              {
                type: 'text',
                content: '<p>Splitting może manifestować się na wiele sposobów. Poznanie tych objawów pomoże Ci rozpoznać, kiedy partner doświadcza splittingu, co jest pierwszym krokiem do odpowiedniej reakcji.</p>'
              },
              {
                type: 'table',
                header: ['Objaw', 'Opis'],
                rows: [
                  ['Impulsywne zachowania', 'Nagłe działania jak wysyłanie obraźliwych wiadomości, zrywanie kontaktu, groźby rozstania.'],
                  ['Bezpodstawne oskarżenia', 'Przypisywanie Ci złych intencji, których nie miałeś/aś.'],
                  ['Nadinterpretacje', 'Dopatrywanie się ukrytych znaczeń w neutralnych zachowaniach.'],
                  ['Złośliwość i późniejszy żal', 'Próby ukarania Cię, po których może nastąpić poczucie winy i próby naprawy.'],
                  ['Postrzeganie siebie jako ofiary', 'Przekonanie, że jest się celowo krzywdzonym, manipulowanym lub nierozumianym.'],
                  ['Utrata kontroli', 'Intensywny gniew prowadzący do utraty samokontroli.'],
                  ['Nadmierna reakcja', 'Reakcje emocjonalne nieproporcjonalne do sytuacji.']
                ]
              },
              {
                type: 'example',
                title: 'Sygnały splittingu w codziennej komunikacji',
                content: `
                  <p><strong>Absolutne stwierdzenia</strong> - Używanie słów "zawsze" i "nigdy": "Zawsze mnie zawodzisz", "Nigdy mnie nie słuchasz", "Za każdym razem robisz to samo".</p>
                  <p><strong>Nagłe zmiany w komunikacji</strong> - Przejście od czułych wiadomości do zimnych lub wrogich w krótkim czasie.</p>
                  <p><strong>Blokowanie kontaktu</strong> - Nagłe ignorowanie wiadomości lub połączeń bez wyraźnego powodu.</p>
                `
              },
              {
                type: 'tip',
                icon: '⚠️',
                content: '<p>Pamiętaj, że objawy splittingu mogą przypominać inne problemy psychologiczne lub być po prostu wyrazem silnego stresu. Rozpoznanie wzorca tych zachowań w czasie jest kluczowe dla właściwej identyfikacji.</p>'
              }
            ]
          },
          {
            id: 'module1-lesson4',
            title: 'Błędne koło splittingu',
            content: [
              {
                type: 'text',
                content: `
                  <p>Splitting często prowadzi do powstania błędnego koła, które może się samopodtrzymywać i prowadzić do coraz większych problemów w relacji. Zrozumienie tego cyklu jest kluczowe, aby móc go przerwać.</p>
                  <h3>Jak działa błędne koło splittingu:</h3>
                `
              },
              {
                type: 'text',
                content: `
                  <ol>
                    <li><strong>Uczucie zranienia:</strong> Osoba z BPD doświadcza uczucia zranienia, często przypominającego dawne traumy.</li>
                    <li><strong>Projekcja uczuć:</strong> Te trudne uczucia są projektowane na partnera.</li>
                    <li><strong>Oskarżenie partnera:</strong> Partner jest oskarżany o celowe zranienie lub złe intencje.</li>
                    <li><strong>Reakcja obronna:</strong> Partner broni się lub próbuje wyjaśnić, co jest postrzegane jako atak.</li>
                    <li><strong>Eskalacja splittingu:</strong> Pierwotne poczucie zagrożenia nasila się, prowadząc do głębszego splittingu.</li>
                    <li><strong>Konflikt:</strong> Dochodzi do konfliktu, który może eskalować.</li>
                    <li><strong>Poczucie bezradności:</strong> Partner czuje, że cokolwiek powie, będzie "tym złym".</li>
                    <li><strong>Pogłębienie problemu:</strong> Negatywne doświadczenie potwierdza pierwotne lęki osoby z BPD.</li>
                  </ol>
                `
              },
              {
                type: 'tip',
                icon: '💡',
                content: '<p>Przerwanie tego cyklu wymaga świadomości obu stron i często zewnętrznego wsparcia. Wasze reakcje mogą albo wzmacniać, albo osłabiać to błędne koło.</p>'
              },
              {
                type: 'example',
                title: 'Przykład błędnego koła',
                content: `
                  <p><strong>Sytuacja początkowa:</strong> Spóźniasz się 20 minut na spotkanie z partnerką.</p>
                  <p><strong>Uczucie zranienia:</strong> Partnerka czuje się porzucona, co przypomina jej wcześniejsze doświadczenia odrzucenia.</p>
                  <p><strong>Projekcja i oskarżenie:</strong> "Zawsze się spóźniasz! Nie obchodzę cię! Robisz to specjalnie, żeby mnie zranić!"</p>
                  <p><strong>Twoja obrona:</strong> "To nieprawda, byłem w korku. Nie dramatyzuj, to tylko 20 minut."</p>
                  <p><strong>Eskalacja:</strong> "Widzisz? Nawet nie przepraszasz! Zawsze umniejszasz moje uczucia! Nigdy cię nie obchodziłam!"</p>
                  <p><strong>Konflikt:</strong> Rozwija się kłótnia, która może trwać godzinami.</p>
                  <p><strong>Twoje poczucie bezradności:</strong> "Cokolwiek powiem, i tak będzie źle. Nie da się z nią rozmawiać."</p>
                  <p><strong>Pogłębienie problemu:</strong> Partnerka czuje, że jej obawy się potwierdziły - "Wiedziałam, że mnie nie kochasz."</p>
                `
              }
            ]
          }
        ]
      },
      {
        id: 'module2',
        title: 'Techniki komunikacji',
        description: 'Poznaj skuteczne metody komunikacji w trudnych sytuacjach',
        lessons: [
          {
            id: 'module2-lesson1',
            title: 'Podstawy komunikacji z osobą doświadczającą splittingu',
            content: '<p>Treść lekcji o podstawach komunikacji...</p>'
          },
          {
            id: 'module2-lesson2',
            title: 'Technika SET',
            content: '<p>Treść lekcji o technice SET...</p>'
          },
          {
            id: 'module2-lesson3',
            title: 'Kanapka komunikacyjna',
            content: '<p>Treść lekcji o kanapce komunikacyjnej...</p>'
          }
        ]
      }
    ];
  }
  
  /**
   * Get default quiz data for a module (fallback)
   * 
   * @param {string} moduleId - Module identifier
   * @returns {Object} Default quiz data
   * @private
   */
  getDefaultQuiz(moduleId) {
    if (moduleId === 'module1') {
      return {
        id: 'quiz-module1',
        title: 'Quiz: Zrozumienie splittingu',
        description: 'Sprawdź swoją wiedzę na temat splittingu',
        passThreshold: 70, // Percentage needed to pass
        questions: [
          {
            id: 'q1',
            text: 'Czym jest splitting?',
            type: 'single', // single or multiple choice
            options: [
              { id: 'a', text: 'Technika terapeutyczna stosowana w leczeniu BPD' },
              { id: 'b', text: 'Mechanizm obronny polegający na postrzeganiu ludzi i sytuacji w kategoriach czarno-białych' },
              { id: 'c', text: 'Świadoma manipulacja stosowana przez osoby z BPD' },
              { id: 'd', text: 'Rodzaj terapii grupowej' }
            ],
            correctAnswer: 'b',
            explanation: 'Splitting to mechanizm obronny, w którym osoba postrzega ludzi i sytuacje jako całkowicie dobre lub złe, bez odcieni szarości.'
          },
          {
            id: 'q2',
            text: 'Które z poniższych są objawami splittingu? (wybierz wszystkie poprawne odpowiedzi)',
            type: 'multiple',
            options: [
              { id: 'a', text: 'Impulsywne zachowania' },
              { id: 'b', text: 'Bezpodstawne oskarżenia' },
              { id: 'c', text: 'Nadinterpretacje' },
              { id: 'd', text: 'Zorganizowane myślenie' }
            ],
            correctAnswer: ['a', 'b', 'c'],
            explanation: 'Impulsywne zachowania, bezpodstawne oskarżenia i nadinterpretacje są typowymi objawami splittingu. Zorganizowane myślenie nie jest charakterystyczne dla splittingu.'
          },
          {
            id: 'q3',
            text: 'Jaka jest najlepsza reakcja, gdy partner doświadcza splittingu?',
            type: 'single',
            options: [
              { id: 'a', text: 'Przekonać go, że jego postrzeganie jest błędne, przedstawiając fakty' },
              { id: 'b', text: 'Zignorować go, dopóki się nie uspokoi' },
              { id: 'c', text: 'Zachować spokój, zwalidować uczucia partnera, ale nie zgadzać się z oskarżeniami' },
              { id: 'd', text: 'Odpowiedzieć równie emocjonalnie, aby partner zrozumiał, jak się czujesz' }
            ],
            correctAnswer: 'c',
            explanation: 'Zachowanie spokoju, walidacja uczuć partnera przy jednoczesnym nieakceptowaniu fałszywych oskarżeń to najlepsza strategia radzenia sobie ze splittingiem.'
          },
          {
            id: 'q4',
            text: 'Co może wywołać splitting u osoby z BPD?',
            type: 'multiple',
            options: [
              { id: 'a', text: 'Poczucie odrzucenia lub zaniedbania' },
              { id: 'b', text: 'Krytyka lub postrzegane zagrożenie dla relacji' },
              { id: 'c', text: 'Silny stres lub przemęczenie' },
              { id: 'd', text: 'Pozytywne doświadczenia i pochwały' }
            ],
            correctAnswer: ['a', 'b', 'c'],
            explanation: 'Splitting może być wywołany przez poczucie odrzucenia, krytykę lub zagrożenie dla relacji, a także przez silny stres. Pozytywne doświadczenia zazwyczaj nie wywołują splittingu, choć mogą prowadzić do idealizacji.'
          },
          {
            id: 'q5',
            text: 'Które z poniższych stwierdzeń na temat błędnego koła splittingu jest prawdziwe?',
            type: 'single',
            options: [
              { id: 'a', text: 'Błędne koło splittingu zawsze prowadzi do zakończenia relacji' },
              { id: 'b', text: 'Obrona i wyjaśnianie są najlepszym sposobem przerwania błędnego koła' },
              { id: 'c', text: 'Błędne koło splittingu może się samopodtrzymywać i prowadzić do eskalacji konfliktów' },
              { id: 'd', text: 'Błędne koło splittingu dotyka tylko osoby z zaburzeniami osobowości' }
            ],
            correctAnswer: 'c',
            explanation: 'Błędne koło splittingu może się samopodtrzymywać i prowadzić do eskalacji konfliktów, jeśli nie zostanie przerwane. Nie zawsze prowadzi do zakończenia relacji, a obrona i wyjaśnianie często tylko pogarszają sytuację.'
          }
        ]
      };
    }
    
    // Default fallback quiz for any module
    return {
      id: `quiz-${moduleId}`,
      title: `Quiz: ${moduleId}`,
      description: `Quiz for module ${moduleId}`,
      passThreshold: 70,
      questions: [
        {
          id: 'q1',
          text: 'Sample question 1',
          type: 'single',
          options: [
            { id: 'a', text: 'Option A' },
            { id: 'b', text: 'Option B' },
            { id: 'c', text: 'Option C' },
            { id: 'd', text: 'Option D' }
          ],
          correctAnswer: 'a',
          explanation: 'Explanation for question 1'
        },
        {
          id: 'q2',
          text: 'Sample question 2',
          type: 'multiple',
          options: [
            { id: 'a', text: 'Option A' },
            { id: 'b', text: 'Option B' },
            { id: 'c', text: 'Option C' },
            { id: 'd', text: 'Option D' }
          ],
          correctAnswer: ['a', 'c'],
          explanation: 'Explanation for question 2'
        }
      ]
    };
  }
}