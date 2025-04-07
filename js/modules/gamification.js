/**
 * Gamification System
 * Handles badges, points, achievements and other gamification elements
 * 
 * @module gamification
 */

import { t } from './i18n.js';

export class GamificationSystem {
  /**
   * Create a new GamificationSystem instance
   * 
   * @param {Object} stateManager - The application state manager
   */
  constructor(stateManager) {
    this.stateManager = stateManager;
    
    // Set up state change listeners
    this.setupStateListeners();
  }
  
  /**
   * Set up listeners for state changes to check for achievements
   * 
   * @private
   */
  setupStateListeners() {
    // Listen for changes to user points to check for point-based achievements
    this.stateManager.subscribe('user.points', (newPoints) => {
      this.checkPointBasedAchievements(newPoints);
    });
    
    // Listen for changes to completed modules to check for module-based achievements
    this.stateManager.subscribe('user.completedModules', (completedModules) => {
      this.checkModuleBasedAchievements(completedModules);
    });
    
    // Listen for changes to quiz results to check for quiz-based achievements
    this.stateManager.subscribe('user.quizResults', (quizResults) => {
      this.checkQuizBasedAchievements(quizResults);
    });
  }
  
  /**
   * Load badges data from server or fallback to default
   * 
   * @returns {Promise} A promise that resolves when badges are loaded
   */
  async loadBadgesData() {
    try {
      // Try to fetch badges data from server
      const response = await fetch('data/badges.json');
      
      if (!response.ok) {
        throw new Error('Failed to load badges data');
      }
      
      const badges = await response.json();
      this.stateManager.setState('badges', badges);
      
      return badges;
    } catch (error) {
      console.error('Error loading badges data:', error);
      
      // Fallback to default badges data
      const fallbackBadges = this.getDefaultBadges();
      this.stateManager.setState('badges', fallbackBadges);
      
      return fallbackBadges;
    }
  }
  
  /**
   * Check for point-based achievements
   * 
   * @param {number} points - Current user points
   * @private
   */
  checkPointBasedAchievements(points) {
    const badges = this.stateManager.getState('badges') || [];
    const pointBadges = badges.filter(badge => badge.type === 'points');
    
    pointBadges.forEach(badge => {
      if (points >= badge.requirement && !this.userHasBadge(badge.id)) {
        this.awardBadge(badge);
      }
    });
  }
  
  /**
   * Check for module-based achievements
   * 
   * @param {Array} completedModules - List of completed module IDs
   * @private
   */
  checkModuleBasedAchievements(completedModules) {
    if (!completedModules || completedModules.length === 0) return;
    
    const badges = this.stateManager.getState('badges') || [];
    const moduleBadges = badges.filter(badge => badge.type === 'module');
    
    moduleBadges.forEach(badge => {
      // Single module completion badge
      if (badge.requirement && badge.requirement.moduleId) {
        if (completedModules.includes(badge.requirement.moduleId) && !this.userHasBadge(badge.id)) {
          this.awardBadge(badge);
        }
      }
      
      // Multiple modules completion badge
      if (badge.requirement && badge.requirement.count) {
        if (completedModules.length >= badge.requirement.count && !this.userHasBadge(badge.id)) {
          this.awardBadge(badge);
        }
      }
      
      // All modules completion badge
      if (badge.requirement && badge.requirement.all) {
        const allModules = this.stateManager.getState('modules') || [];
        if (completedModules.length === allModules.length && !this.userHasBadge(badge.id)) {
          this.awardBadge(badge);
        }
      }
    });
  }
  
  /**
   * Check for quiz-based achievements
   * 
   * @param {Object} quizResults - Map of quiz results by quiz ID
   * @private
   */
  checkQuizBasedAchievements(quizResults) {
    if (!quizResults) return;
    
    const badges = this.stateManager.getState('badges') || [];
    const quizBadges = badges.filter(badge => badge.type === 'quiz');
    
    quizBadges.forEach(badge => {
      // Perfect score on a specific quiz
      if (badge.requirement && badge.requirement.quizId && badge.requirement.score) {
        const result = quizResults[badge.requirement.quizId];
        if (result && result.score >= badge.requirement.score && !this.userHasBadge(badge.id)) {
          this.awardBadge(badge);
        }
      }
      
      // Perfect score on all quizzes
      if (badge.requirement && badge.requirement.allQuizzes) {
        const allPerfect = Object.values(quizResults).every(result => 
          result.score >= (badge.requirement.score || 100)
        );
        
        if (allPerfect && Object.keys(quizResults).length > 0 && !this.userHasBadge(badge.id)) {
          this.awardBadge(badge);
        }
      }
    });
  }
  
  /**
   * Check if user has a specific badge
   * 
   * @param {string} badgeId - Badge identifier
   * @returns {boolean} Whether user has the badge
   * @private
   */
  userHasBadge(badgeId) {
    const userBadges = this.stateManager.getState('user.badges') || [];
    return userBadges.some(badge => badge.id === badgeId);
  }
  
  /**
   * Award a badge to the user
   * 
   * @param {Object} badge - Badge data
   * @private 
   */
  awardBadge(badge) {
    const awarded = this.stateManager.awardBadge(badge.id, {
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      points: badge.points || 0
    });
    
    if (awarded) {
      // Show achievement notification
      const uiController = this.stateManager.getUIController();
      if (uiController) {
        uiController.showAchievementModal(badge, badge.points || 0);
      }
      
      // Add notification
      this.stateManager.addNotification({
        type: 'success',
        message: t('notifications.badgeEarned', { name: badge.name }),
        icon: badge.icon || '🏆'
      });
    }
  }
  
  /**
   * Get default badges data (fallback)
   * 
   * @returns {Array} Default badges data
   * @private
   */
  getDefaultBadges() {
    return [
      // Point-based badges
      {
        id: 'points-100',
        type: 'points',
        name: 'Początkujący',
        description: 'Zdobądź 100 punktów',
        icon: '🌱',
        points: 10,
        requirement: 100
      },
      {
        id: 'points-500',
        type: 'points',
        name: 'Wzrastający',
        description: 'Zdobądź 500 punktów',
        icon: '🌿',
        points: 20,
        requirement: 500
      },
      {
        id: 'points-1000',
        type: 'points',
        name: 'Ekspert',
        description: 'Zdobądź 1000 punktów',
        icon: '🌳',
        points: 50,
        requirement: 1000
      },
      
      // Module-based badges
      {
        id: 'module-module1-completed',
        type: 'module',
        name: 'Podstawy splittingu',
        description: 'Ukończ moduł "Zrozumienie splittingu"',
        icon: '🧠',
        points: 30,
        requirement: {
          moduleId: 'module1'
        }
      },
      {
        id: 'module-module2-completed',
        type: 'module',
        name: 'Mistrz komunikacji',
        description: 'Ukończ moduł "Techniki komunikacji"',
        icon: '💬',
        points: 30,
        requirement: {
          moduleId: 'module2'
        }
      },
      {
        id: 'module-all-completed',
        type: 'module',
        name: 'Ukończony kurs',
        description: 'Ukończ wszystkie moduły',
        icon: '🎓',
        points: 100,
        requirement: {
          all: true
        }
      },
      
      // Quiz-based badges
      {
        id: 'quiz-module1-perfect',
        type: 'quiz',
        name: 'Doskonała wiedza',
        description: 'Uzyskaj 100% w quizie modułu 1',
        icon: '🏅',
        points: 40,
        requirement: {
          quizId: 'quiz-module1',
          score: 100
        }
      },
      {
        id: 'quiz-all-perfect',
        type: 'quiz',
        name: 'Quiz Master',
        description: 'Uzyskaj 100% we wszystkich quizach',
        icon: '🏆',
        points: 100,
        requirement: {
          allQuizzes: true,
          score: 100
        }
      },
      
      // Streak-based badges
      {
        id: 'streak-3',
        type: 'streak',
        name: 'Trzy dni z rzędu',
        description: 'Ucz się przez 3 dni z rzędu',
        icon: '🔥',
        points: 15,
        requirement: {
          days: 3
        }
      },
      {
        id: 'streak-7',
        type: 'streak',
        name: 'Tygodniowa passa',
        description: 'Ucz się przez 7 dni z rzędu',
        icon: '🔥🔥',
        points: 30,
        requirement: {
          days: 7
        }
      },
      
      // Special badges
      {
        id: 'first-lesson',
        type: 'special',
        name: 'Pierwszy krok',
        description: 'Ukończ pierwszą lekcję',
        icon: '👣',
        points: 5
      },
      {
        id: 'first-quiz',
        type: 'special',
        name: 'Pierwszy test',
        description: 'Ukończ pierwszy quiz',
        icon: '📝',
        points: 10
      }
    ];
  }
}