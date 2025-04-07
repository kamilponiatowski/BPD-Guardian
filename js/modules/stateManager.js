/**
 * State Manager Module
 * Manages application state and provides a centralized place for data and state changes
 * Implements simple pub/sub pattern to notify subscribers about state changes
 * 
 * @module stateManager
 */

export class StateManager {
  /**
   * Create a new StateManager instance
   */
  constructor() {
    // Initial state
    this.state = {
      // User progress
      user: {
        points: 0,
        badges: [],
        completedModules: [],
        moduleProgress: {}, // moduleId: { completed: true/false, progress: 0-100, lessons: {...} }
        quizResults: {}     // quizId: { score: 0-100, answers: [...] }
      },

      // Content data
      modules: [],
      currentModule: null,
      currentLesson: null,

      // Quiz data
      currentQuiz: null,
      currentQuizQuestion: 0,
      quizAnswers: [],

      // UI state
      currentPage: 'home',
      notifications: []
    };

    // Event subscribers
    this.subscribers = {};

    // Load persisted state from localStorage
    this.loadState();

    // Save state to localStorage when page is unloaded
    window.addEventListener('beforeunload', () => {
      this.saveState();
    });
  }

  /**
   * Get the complete state or a specific part of it
   * 
   * @param {string} [path] - Optional dot notation path to get a specific part of the state
   * @returns {*} The requested state or part of it
   */
  getState(path) {
    if (!path) {
      return { ...this.state }; // Return a copy to prevent direct mutations
    }

    // Navigate through the state object using the path
    return path.split('.').reduce((obj, key) => {
      return obj && obj[key] !== undefined ? obj[key] : undefined;
    }, this.state);
  }

  /**
   * Update part of the state
   * 
   * @param {string} path - Dot notation path to the state part to update
   * @param {*} value - New value
   * @param {boolean} [notify=true] - Whether to notify subscribers about the change
   */
  setState(path, value, notify = true) {
    if (!path) {
      console.error('Path is required for setState');
      return;
    }

    const keys = path.split('.');
    let current = this.state;

    // Navigate to the parent object of the property to update
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];

      // Create missing objects in the path
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }

      current = current[key];
    }

    // Update the value
    const lastKey = keys[keys.length - 1];
    const oldValue = current[lastKey];
    current[lastKey] = value;

    // Notify subscribers if the value has changed
    if (notify && !this.deepEqual(oldValue, value)) {
      this.notify(path, value, oldValue);
    }
  }

  /**
   * Check if two values are deeply equal
   * 
   * @param {*} a - First value
   * @param {*} b - Second value
   * @returns {boolean} Whether the values are equal
   * @private
   */
  deepEqual(a, b) {
    if (a === b) return true;

    if (a === null || b === null ||
      typeof a !== 'object' || typeof b !== 'object') {
      return false;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    return keysA.every(key =>
      keysB.includes(key) && this.deepEqual(a[key], b[key])
    );
  }

  /**
   * Subscribe to state changes
   * 
   * @param {string} path - Dot notation path to subscribe to
   * @param {Function} callback - Function to call when the state changes
   * @returns {Function} Unsubscribe function
   */
  subscribe(path, callback) {
    if (!this.subscribers[path]) {
      this.subscribers[path] = [];
    }

    this.subscribers[path].push(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers[path] = this.subscribers[path].filter(cb => cb !== callback);
    };
  }

  /**
   * Notify subscribers about state changes
   * 
   * @param {string} path - Path that changed
   * @param {*} newValue - New value
   * @param {*} oldValue - Old value
   * @private
   */
  notify(path, newValue, oldValue) {
    // Notify direct subscribers
    if (this.subscribers[path]) {
      this.subscribers[path].forEach(callback => {
        callback(newValue, oldValue, path);
      });
    }

    // Notify parent path subscribers
    const pathParts = path.split('.');
    for (let i = pathParts.length - 1; i > 0; i--) {
      const parentPath = pathParts.slice(0, i).join('.');
      if (this.subscribers[parentPath]) {
        const parentNewValue = this.getState(parentPath);
        this.subscribers[parentPath].forEach(callback => {
          callback(parentNewValue, null, parentPath);
        });
      }
    }

    // Notify root subscribers
    if (this.subscribers['*']) {
      this.subscribers['*'].forEach(callback => {
        callback(this.state, null, '*');
      });
    }
  }

  /**
   * Save state to localStorage
   * Only saves the user progress part to keep localStorage size reasonable
   * 
   * @private
   */
  saveState() {
    try {
      const stateToSave = {
        user: this.state.user
      };

      localStorage.setItem('splittingCoachState', JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Error saving state to localStorage:', error);
    }
  }

  /**
   * Load state from localStorage
   * 
   * @private
   */
  loadState() {
    try {
      const savedState = localStorage.getItem('splittingCoachState');

      if (savedState) {
        const parsedState = JSON.parse(savedState);

        // Merge saved state with initial state
        if (parsedState.user) {
          this.state.user = {
            ...this.state.user,
            ...parsedState.user
          };
        }
      }
    } catch (error) {
      console.error('Error loading state from localStorage:', error);
    }
  }

  /**
   * Award points to the user
   * 
   * @param {number} points - Number of points to award
   * @param {string} [reason] - Reason for awarding points
   * @returns {number} New total points
   */
  awardPoints(points, reason) {
    const currentPoints = this.getState('user.points') || 0;
    const newPoints = currentPoints + points;

    this.setState('user.points', newPoints);

    // Add notification
    if (reason) {
      this.addNotification({
        type: 'success',
        message: `+${points} punktów: ${reason}`,
        icon: '🎉'
      });
    }

    return newPoints;
  }

  /**
   * Award a badge to the user
   * 
   * @param {string} badgeId - Badge identifier
   * @param {Object} badgeData - Badge data (name, description, points)
   * @returns {boolean} Whether the badge was newly awarded
   */
  awardBadge(badgeId, badgeData) {
    const userBadges = this.getState('user.badges') || [];

    // Check if user already has this badge
    if (userBadges.some(badge => badge.id === badgeId)) {
      return false;
    }

    // Add badge to user badges
    const newBadge = {
      id: badgeId,
      ...badgeData,
      awardedAt: new Date().toISOString()
    };

    this.setState('user.badges', [...userBadges, newBadge]);

    // Award points for the badge if specified
    if (badgeData.points) {
      this.awardPoints(badgeData.points, `Zdobyto odznakę: ${badgeData.name}`);
    }

    return true;
  }

  /**
   * Mark a module as completed
   * 
   * @param {string} moduleId - Module identifier
   * @returns {boolean} Whether the module was newly completed
   */
  completeModule(moduleId) {
    const completedModules = this.getState('user.completedModules') || [];

    // Check if module is already completed
    if (completedModules.includes(moduleId)) {
      return false;
    }

    // Add module to completed modules
    this.setState('user.completedModules', [...completedModules, moduleId]);

    // Update module progress
    const moduleProgress = this.getState(`user.moduleProgress.${moduleId}`) || {};
    this.setState(`user.moduleProgress.${moduleId}`, {
      ...moduleProgress,
      completed: true,
      progress: 100
    });

    return true;
  }

  /**
   * Update progress for a module
   * 
   * @param {string} moduleId - Module identifier
   * @param {number} progress - Progress percentage (0-100)
   */
  updateModuleProgress(moduleId, progress) {
    const moduleProgress = this.getState(`user.moduleProgress.${moduleId}`) || {};

    this.setState(`user.moduleProgress.${moduleId}`, {
      ...moduleProgress,
      progress: Math.max(0, Math.min(100, progress))
    });

    // If progress is 100%, mark the module as completed
    if (progress >= 100) {
      this.completeModule(moduleId);
    }
  }

  /**
   * Save quiz results
   * 
   * @param {string} quizId - Quiz identifier
   * @param {Object} results - Quiz results (score, answers)
   */
  saveQuizResults(quizId, results) {
    this.setState(`user.quizResults.${quizId}`, results);
  }

  /**
   * Add a notification to be displayed to the user
   * 
   * @param {Object} notification - Notification data (type, message, icon)
   */
  addNotification(notification) {
    const notifications = this.getState('notifications') || [];

    const newNotification = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      ...notification
    };

    this.setState('notifications', [...notifications, newNotification]);

    return newNotification.id;
  }

  /**
   * Remove a notification
   * 
   * @param {number} notificationId - Notification identifier
   */
  removeNotification(notificationId) {
    const notifications = this.getState('notifications') || [];

    this.setState(
      'notifications',
      notifications.filter(notification => notification.id !== notificationId)
    );
  }

  // Dodaj te metody do klasy StateManager w pliku js/modules/stateManager.js

  /**
   * Set the UI controller instance
   * 
   * @param {UIController} controller - The UI controller instance
   */
  setUIController(controller) {
    this.uiController = controller;
  }

  /**
   * Get the UI controller instance
   * 
   * @returns {UIController} The UI controller instance
   */
  getUIController() {
    return this.uiController;
  }

  /**
   * Set the module loader instance
   * 
   * @param {ModuleLoader} loader - The module loader instance
   */
  setModuleLoader(loader) {
    this.moduleLoader = loader;
  }

  /**
   * Get the module loader instance
   * 
   * @returns {ModuleLoader} The module loader instance
   */
  getModuleLoader() {
    return this.moduleLoader;
  }
}