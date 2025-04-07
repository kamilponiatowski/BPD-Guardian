/**
 * Progress Tracker Component
 * Tracks and visualizes user progress across modules and lessons
 * 
 * @module components/progressTracker
 */

export class ProgressTracker {
    /**
     * Create a new ProgressTracker instance
     * 
     * @param {Object} stateManager - The application state manager
     */
    constructor(stateManager) {
      this.stateManager = stateManager;
      
      // Initialize progress tracker
      this.init();
    }
    
    /**
     * Initialize progress tracker events and state
     */
    init() {
      // Listen for state changes to update progress visualization
      this.stateManager.subscribe('user.moduleProgress', (moduleProgress) => {
        this.updateModuleProgressUI(moduleProgress);
      });
      
      this.stateManager.subscribe('user.completedModules', (completedModules) => {
        this.updateCompletedModulesUI(completedModules);
      });
      
      this.stateManager.subscribe('currentModule', (module) => {
        if (module) {
          this.updateCurrentModuleProgress(module.id);
        }
      });
      
      // Initial update of progress UI
      this.updateAllProgressUI();
    }
    
    /**
     * Update all progress UI elements
     */
    updateAllProgressUI() {
      const moduleProgress = this.stateManager.getState('user.moduleProgress') || {};
      const completedModules = this.stateManager.getState('user.completedModules') || [];
      const currentModule = this.stateManager.getState('currentModule');
      
      this.updateModuleProgressUI(moduleProgress);
      this.updateCompletedModulesUI(completedModules);
      
      if (currentModule) {
        this.updateCurrentModuleProgress(currentModule.id);
      }
    }
    
    /**
     * Update module progress UI elements
     * 
     * @param {Object} moduleProgress - Module progress data
     */
    updateModuleProgressUI(moduleProgress) {
      if (!moduleProgress) return;
      
      // Update progress bars in modules grid
      Object.entries(moduleProgress).forEach(([moduleId, data]) => {
        const progressBar = document.querySelector(`.module-card[data-module-id="${moduleId}"] .module-card__progress-bar`);
        
        if (progressBar) {
          progressBar.style.width = `${data.progress || 0}%`;
          
          // Update parent for accessibility
          const progressContainer = progressBar.closest('.module-card__progress');
          if (progressContainer) {
            progressContainer.setAttribute('aria-label', `Postęp: ${data.progress || 0}%`);
          }
        }
        
        // Update module card status
        const moduleCard = document.querySelector(`.module-card[data-module-id="${moduleId}"]`);
        if (moduleCard) {
          if (data.completed) {
            moduleCard.classList.add('module-card--completed');
          } else {
            moduleCard.classList.remove('module-card--completed');
          }
        }
      });
      
      // Update progress items on the Progress page
      const progressItems = document.querySelectorAll('.module-progress-item');
      progressItems.forEach(item => {
        const moduleId = item.dataset.moduleId;
        if (moduleId && moduleProgress[moduleId]) {
          const progress = moduleProgress[moduleId].progress || 0;
          const progressBar = item.querySelector('.module-progress-item__progress-bar');
          const progressText = item.querySelector('.module-progress-item__percentage');
          
          if (progressBar) {
            progressBar.style.width = `${progress}%`;
          }
          
          if (progressText) {
            progressText.textContent = `${progress}%`;
          }
        }
      });
    }
    
    /**
     * Update completed modules UI elements
     * 
     * @param {Array} completedModules - Array of completed module IDs
     */
    updateCompletedModulesUI(completedModules) {
      if (!completedModules) return;
      
      const completedCount = document.getElementById('completed-modules');
      if (completedCount) {
        completedCount.textContent = completedModules.length;
      }
      
      // Update badges related to module completion
      completedModules.forEach(moduleId => {
        const badge = document.querySelector(`.badge[data-badge="${moduleId}-complete"]`);
        if (badge) {
          badge.classList.remove('badge--locked');
          badge.textContent = '✅';
        }
      });
    }
    
    /**
     * Update current module progress in the module content page
     * 
     * @param {string} moduleId - Module identifier
     */
    updateCurrentModuleProgress(moduleId) {
      const moduleProgress = this.stateManager.getState(`user.moduleProgress.${moduleId}`) || {};
      const progressBar = document.querySelector('.module-nav__progress-bar');
      
      if (progressBar) {
        const progress = moduleProgress.progress || 0;
        progressBar.style.width = `${progress}%`;
        
        // Update parent for accessibility
        const progressContainer = progressBar.closest('.module-nav__progress');
        if (progressContainer) {
          progressContainer.setAttribute('aria-label', `Postęp w module: ${progress}%`);
        }
      }
    }
    
    /**
     * Calculate and update module progress
     * 
     * @param {string} moduleId - Module identifier
     */
    calculateModuleProgress(moduleId) {
      const module = this.stateManager.getState('modules').find(m => m.id === moduleId);
      const moduleProgress = this.stateManager.getState(`user.moduleProgress.${moduleId}`) || {};
      const lessonsProgress = moduleProgress.lessons || {};
      
      if (!module) return;
      
      // Count completed lessons
      const completedLessons = Object.values(lessonsProgress).filter(l => l.completed).length;
      
      // Calculate progress percentage (including quiz at the end)
      const totalSteps = module.lessons.length + 1; // Lessons + quiz
      const progressPercentage = Math.round((completedLessons / totalSteps) * 100);
      
      // Update module progress in state
      this.stateManager.setState(`user.moduleProgress.${moduleId}.progress`, progressPercentage);
      
      // Check if module is completed
      if (progressPercentage >= 100) {
        this.stateManager.completeModule(moduleId);
      }
      
      return progressPercentage;
    }
    
    /**
     * Mark a lesson as completed
     * 
     * @param {string} moduleId - Module identifier
     * @param {string} lessonId - Lesson identifier
     */
    completeLesson(moduleId, lessonId) {
      // Mark lesson as completed in state
      this.stateManager.setState(`user.moduleProgress.${moduleId}.lessons.${lessonId}`, {
        completed: true,
        completedAt: new Date().toISOString()
      });
      
      // Recalculate module progress
      this.calculateModuleProgress(moduleId);
    }
  }