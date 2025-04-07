/**
 * UI Controller Module
 * Handles user interface updates and interactions
 * 
 * @module uiController
 */

import { t } from './i18n.js';

export class UIController {
  /**
   * Create a new UIController instance
   * 
   * @param {Object} stateManager - The application state manager
   */
  constructor(stateManager) {
    this.stateManager = stateManager;
    
    // Set up state change listeners
    this.setupStateListeners();
  }
  
  /**
   * Set up listeners for state changes
   * 
   * @private
   */
  setupStateListeners() {
    // Listen for changes to user points
    this.stateManager.subscribe('user.points', (newPoints) => {
      this.updatePointsDisplay(newPoints);
    });
    
    // Listen for changes to user badges
    this.stateManager.subscribe('user.badges', (badges) => {
      this.updateBadgesDisplay(badges);
    });
    
    // Listen for changes to completed modules
    this.stateManager.subscribe('user.completedModules', (completedModules) => {
      this.updateCompletedModulesDisplay(completedModules);
    });
    
    // Listen for changes to module progress
    this.stateManager.subscribe('user.moduleProgress', (moduleProgress) => {
      this.updateModuleProgressDisplay(moduleProgress);
    });
    
    // Listen for changes to current page
    this.stateManager.subscribe('currentPage', (newPage) => {
      this.updateActivePage(newPage);
    });
    
    // Listen for changes to the current module
    this.stateManager.subscribe('currentModule', (module) => {
      this.updateModuleDisplay(module);
    });
    
    // Listen for changes to the current lesson
    this.stateManager.subscribe('currentLesson', (lesson) => {
      this.updateLessonDisplay(lesson);
    });
    
    // Listen for changes to notifications
    this.stateManager.subscribe('notifications', (notifications) => {
      this.updateNotifications(notifications);
    });
  }
  
  /**
   * Render the initial UI based on current state
   */
  renderInitialUI() {
    // Update points display
    this.updatePointsDisplay(this.stateManager.getState('user.points'));
    
    // Update badges display
    this.updateBadgesDisplay(this.stateManager.getState('user.badges'));
    
    // Update completed modules display
    this.updateCompletedModulesDisplay(this.stateManager.getState('user.completedModules'));
    
    // Update module progress display
    this.updateModuleProgressDisplay(this.stateManager.getState('user.moduleProgress'));
    
    // Render modules grid
    this.renderModulesGrid(this.stateManager.getState('modules'));
    
    // Render badges collection
    this.renderBadgesCollection();
    
    // Render modules progress in progress page
    this.renderModulesProgress();
  }
  
  /**
   * Show a specific page and update state
   * 
   * @param {string} pageId - The ID of the page to show
   */
  showPage(pageId) {
    if (!document.getElementById(pageId)) {
      console.error(`Page with ID "${pageId}" not found`);
      return;
    }
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
      page.classList.remove('page--active');
    });
    
    // Show selected page
    document.getElementById(pageId).classList.add('page--active');
    
    // Update active nav link
    document.querySelectorAll('.nav__link').forEach(link => {
      if (link.dataset.page === pageId) {
        link.classList.add('nav__link--active');
      } else {
        link.classList.remove('nav__link--active');
      }
    });
    
    // Close mobile menu if open
    const menuToggle = document.querySelector('.nav__toggle');
    if (menuToggle && menuToggle.getAttribute('aria-expanded') === 'true') {
      menuToggle.setAttribute('aria-expanded', 'false');
      document.querySelector('.nav__menu').classList.remove('nav__menu--open');
    }
    
    // Update state
    this.stateManager.setState('currentPage', pageId);
  }
  
  /**
   * Update the active page based on state
   * 
   * @param {string} pageId - The ID of the active page
   * @private
   */
  updateActivePage(pageId) {
    // Only update DOM if necessary (already handled by showPage)
    if (!document.getElementById(pageId).classList.contains('page--active')) {
      this.showPage(pageId);
    }
  }
  
  /**
   * Update points display
   * 
   * @param {number} points - Current user points
   * @private
   */
  updatePointsDisplay(points) {
    // Update header points display
    const pointsDisplay = document.querySelector('.user-progress__points');
    if (pointsDisplay) {
      pointsDisplay.textContent = t('user.points', { pointsValue: points || 0 });
      pointsDisplay.dataset.pointsValue = points || 0;
    }
    
    // Update progress page points display
    const earnedPointsDisplay = document.getElementById('earned-points');
    if (earnedPointsDisplay) {
      earnedPointsDisplay.textContent = points || 0;
    }
  }
  
  /**
   * Update badges display
   * 
   * @param {Array} badges - User badges
   * @private
   */
  updateBadgesDisplay(badges) {
    // Update header badges display
    const badgesContainer = document.querySelector('.user-progress__badges');
    if (badgesContainer) {
      badgesContainer.innerHTML = '';
      
      // Show up to 3 badges in header
      const displayBadges = badges && badges.length > 0 
        ? badges.slice(0, 3) 
        : [];
      
      displayBadges.forEach(badge => {
        const badgeElement = document.createElement('div');
        badgeElement.className = 'user-progress__badge';
        badgeElement.setAttribute('title', badge.name);
        badgeElement.textContent = badge.icon || '🏆';
        badgesContainer.appendChild(badgeElement);
      });
      
      // Add "more" indicator if there are more badges
      if (badges && badges.length > 3) {
        const moreElement = document.createElement('div');
        moreElement.className = 'user-progress__badge user-progress__badge--more';
        moreElement.textContent = `+${badges.length - 3}`;
        badgesContainer.appendChild(moreElement);
      }
    }
    
    // Update progress page badges count
    const earnedBadgesDisplay = document.getElementById('earned-badges');
    if (earnedBadgesDisplay) {
      earnedBadgesDisplay.textContent = badges ? badges.length : 0;
    }
    
    // Update badges collection on progress page
    this.renderBadgesCollection();
  }
  
  /**
   * Update completed modules display
   * 
   * @param {Array} completedModules - Completed module IDs
   * @private
   */
  updateCompletedModulesDisplay(completedModules) {
    // Update progress page completed modules count
    const completedModulesDisplay = document.getElementById('completed-modules');
    if (completedModulesDisplay) {
      completedModulesDisplay.textContent = completedModules ? completedModules.length : 0;
    }
    
    // Update modules grid to reflect completion status
    this.renderModulesGrid(this.stateManager.getState('modules'));
  }
  
  /**
   * Update module progress display
   * 
   * @param {Object} moduleProgress - Module progress data
   * @private
   */
  updateModuleProgressDisplay(moduleProgress) {
    if (!moduleProgress) return;
    
    // Update progress bars in modules grid
    Object.entries(moduleProgress).forEach(([moduleId, data]) => {
      const moduleCard = document.querySelector(`.module-card[data-module-id="${moduleId}"]`);
      if (moduleCard) {
        const progressBar = moduleCard.querySelector('.module-card__progress-bar');
        if (progressBar) {
          progressBar.style.width = `${data.progress || 0}%`;
        }
        
        // If module is completed, add completed class
        if (data.completed) {
          moduleCard.classList.add('module-card--completed');
        } else {
          moduleCard.classList.remove('module-card--completed');
        }
      }
    });
    
    // Update module progress on module content page
    const currentModuleId = this.stateManager.getState('currentModule.id');
    if (currentModuleId && moduleProgress[currentModuleId]) {
      const moduleNavProgress = document.querySelector('.module-nav__progress-bar');
      if (moduleNavProgress) {
        moduleNavProgress.style.width = `${moduleProgress[currentModuleId].progress || 0}%`;
      }
    }
    
    // Update modules progress on progress page
    this.renderModulesProgress();
  }
  
  /**
   * Render the modules grid
   * 
   * @param {Array} modules - Module data
   */
  renderModulesGrid(modules) {
    if (!modules || modules.length === 0) return;
    
    const container = document.getElementById('modules-container');
    if (!container) return;
    
    // Clear container
    container.innerHTML = '';
    
    // Get user progress data
    const completedModules = this.stateManager.getState('user.completedModules') || [];
    const moduleProgress = this.stateManager.getState('user.moduleProgress') || {};
    
    // Render each module
    modules.forEach((module, index) => {
      const isCompleted = completedModules.includes(module.id);
      const progress = moduleProgress[module.id] ? moduleProgress[module.id].progress || 0 : 0;
      
      const moduleCard = document.createElement('div');
      moduleCard.className = `module-card ${isCompleted ? 'module-card--completed' : ''}`;
      moduleCard.dataset.moduleId = module.id;
      
      // Module header with number and progress
      const moduleHeader = document.createElement('div');
      moduleHeader.className = 'module-card__header';
      
      const moduleNumber = document.createElement('span');
      moduleNumber.className = 'module-card__number';
      moduleNumber.textContent = `${t('modules.module')} ${index + 1}`;
      
      const moduleProgressContainer = document.createElement('div');
      moduleProgressContainer.className = 'module-card__progress';
      moduleProgressContainer.setAttribute('aria-label', `${t('modules.progress')}: ${progress}%`);
      
      const moduleProgressBar = document.createElement('div');
      moduleProgressBar.className = 'module-card__progress-bar';
      moduleProgressBar.style.width = `${progress}%`;
      
      moduleProgressContainer.appendChild(moduleProgressBar);
      moduleHeader.appendChild(moduleNumber);
      moduleHeader.appendChild(moduleProgressContainer);
      
      // Module title and description
      const moduleTitle = document.createElement('h2');
      moduleTitle.className = 'module-card__title';
      moduleTitle.textContent = module.title;
      
      const moduleDesc = document.createElement('p');
      moduleDesc.className = 'module-card__desc';
      moduleDesc.textContent = module.description;
      
      // Module lessons list
      const moduleLessons = document.createElement('ul');
      moduleLessons.className = 'module-card__lessons';
      
      module.lessons.forEach(lesson => {
        const lessonItem = document.createElement('li');
        lessonItem.className = 'module-card__lesson';
        lessonItem.textContent = lesson.title;
        moduleLessons.appendChild(lessonItem);
      });
      
      // Module CTA button
      const moduleCta = document.createElement('button');
      moduleCta.className = 'btn module-card__cta';
      moduleCta.dataset.module = module.id;
      moduleCta.textContent = isCompleted 
        ? t('modules.reviewBtn') 
        : t('modules.startBtn');
      
      // Module badges
      const moduleBadges = document.createElement('div');
      moduleBadges.className = 'module-card__badges';
      
      // Completion badge
      const completionBadge = document.createElement('div');
      completionBadge.className = `badge ${isCompleted ? '' : 'badge--locked'}`;
      completionBadge.dataset.badge = `${module.id}-complete`;
      completionBadge.setAttribute('aria-label', isCompleted 
        ? t('modules.completedBadge') 
        : t('modules.lockedBadge'));
      completionBadge.textContent = isCompleted ? '✅' : '🔒';
      
      moduleBadges.appendChild(completionBadge);
      
      // Add all elements to card
      moduleCard.appendChild(moduleHeader);
      moduleCard.appendChild(moduleTitle);
      moduleCard.appendChild(moduleDesc);
      moduleCard.appendChild(moduleLessons);
      moduleCard.appendChild(moduleCta);
      moduleCard.appendChild(moduleBadges);
      
      // Add event listener to button
      moduleCta.addEventListener('click', () => {
        const moduleLoader = this.stateManager.getModuleLoader();
        if (moduleLoader) {
          moduleLoader.openModule(module.id);
          this.showPage('module-content');
        }
      });
      
      // Add card to container
      container.appendChild(moduleCard);
    });
  }
  
  /**
   * Render badges collection
   * 
   * @private
   */
  renderBadgesCollection() {
    const container = document.getElementById('badges-container');
    if (!container) return;
    
    // Clear container
    container.innerHTML = '';
    
    // Get badges data
    const userBadges = this.stateManager.getState('user.badges') || [];
    const allBadges = this.stateManager.getState('badges') || [];
    
    // Create a map of user badges for quick lookup
    const userBadgesMap = {};
    userBadges.forEach(badge => {
      userBadgesMap[badge.id] = badge;
    });
    
    // Render each badge
    allBadges.forEach(badge => {
      const isUnlocked = userBadgesMap[badge.id] !== undefined;
      
      const badgeElement = document.createElement('div');
      badgeElement.className = `badge ${isUnlocked ? '' : 'badge--locked'}`;
      badgeElement.dataset.badgeId = badge.id;
      badgeElement.setAttribute('title', isUnlocked ? badge.name : t('badges.locked'));
      badgeElement.setAttribute('aria-label', isUnlocked 
        ? badge.name 
        : t('badges.lockedBadge', { name: badge.name }));
      
      badgeElement.textContent = isUnlocked ? (badge.icon || '🏆') : '🔒';
      
      // Add tooltip with badge details (using title attribute or custom tooltip)
      
      // Add to container
      container.appendChild(badgeElement);
    });
  }
  
  /**
   * Render modules progress in progress page
   * 
   * @private
   */
  renderModulesProgress() {
    const container = document.getElementById('modules-progress-container');
    if (!container) return;
    
    // Clear container
    container.innerHTML = '';
    
    // Get modules and progress data
    const modules = this.stateManager.getState('modules') || [];
    const moduleProgress = this.stateManager.getState('user.moduleProgress') || {};
    
    // Render each module's progress
    modules.forEach((module, index) => {
      const progress = moduleProgress[module.id] 
        ? moduleProgress[module.id].progress || 0 
        : 0;
      
      const moduleElement = document.createElement('div');
      moduleElement.className = 'module-progress-item';
      
      const moduleInfo = document.createElement('div');
      moduleInfo.className = 'module-progress-item__info';
      
      const moduleTitle = document.createElement('h3');
      moduleTitle.className = 'module-progress-item__title';
      moduleTitle.textContent = `${index + 1}. ${module.title}`;
      
      const moduleProgressText = document.createElement('div');
      moduleProgressText.className = 'module-progress-item__percentage';
      moduleProgressText.textContent = `${progress}%`;
      
      moduleInfo.appendChild(moduleTitle);
      moduleInfo.appendChild(moduleProgressText);
      
      const moduleProgressContainer = document.createElement('div');
      moduleProgressContainer.className = 'module-progress-item__progress';
      moduleProgressContainer.setAttribute('aria-label', `${t('modules.progress')}: ${progress}%`);
      
      const moduleProgressBar = document.createElement('div');
      moduleProgressBar.className = 'module-progress-item__progress-bar';
      moduleProgressBar.style.width = `${progress}%`;
      
      moduleProgressContainer.appendChild(moduleProgressBar);
      
      moduleElement.appendChild(moduleInfo);
      moduleElement.appendChild(moduleProgressContainer);
      
      container.appendChild(moduleElement);
    });
  }
  
  /**
   * Update the module display in the module content page
   * 
   * @param {Object} module - Module data
   * @private
   */
  updateModuleDisplay(module) {
    if (!module) return;
    
    // Update module progress bar
    const progress = this.stateManager.getState(`user.moduleProgress.${module.id}.progress`) || 0;
    const moduleNavProgress = document.querySelector('.module-nav__progress-bar');
    if (moduleNavProgress) {
      moduleNavProgress.style.width = `${progress}%`;
    }
  }
  
  /**
   * Update the lesson display in the module content page
   * 
   * @param {Object} lesson - Lesson data
   * @private
   */
  updateLessonDisplay(lesson) {
    if (!lesson) return;
    
    const container = document.getElementById('module-content-container');
    if (!container) return;
    
    // Clear container
    container.innerHTML = '';
    
    // Create lesson content elements
    const lessonTitle = document.createElement('h1');
    lessonTitle.className = 'lesson__title';
    lessonTitle.textContent = lesson.title;
    
    const lessonContent = document.createElement('div');
    lessonContent.className = 'lesson__content';
    
    // Handle different content types
    if (typeof lesson.content === 'string') {
      // Simple string content
      lessonContent.innerHTML = lesson.content;
    } else if (Array.isArray(lesson.content)) {
      // Array of content blocks
      lesson.content.forEach(block => {
        const blockElement = this.createContentBlock(block);
        lessonContent.appendChild(blockElement);
      });
    }
    
    // Add to container
    container.appendChild(lessonTitle);
    container.appendChild(lessonContent);
    
    // Update navigation buttons
    const prevButton = document.querySelector('.module-navigation__prev');
    const nextButton = document.querySelector('.module-navigation__next');
    
    if (prevButton) {
      prevButton.disabled = !lesson.hasPrevious;
    }
    
    if (nextButton) {
      if (lesson.isLastLesson) {
        nextButton.textContent = t('module.toQuiz');
      } else {
        nextButton.textContent = t('module.next');
      }
    }
  }
  
  /**
   * Create a content block element based on block type
   * 
   * @param {Object} block - Content block data
   * @returns {HTMLElement} Block element
   * @private
   */
  createContentBlock(block) {
    const blockElement = document.createElement('div');
    blockElement.className = `content-block content-block--${block.type}`;
    
    switch (block.type) {
      case 'text':
        blockElement.innerHTML = block.content;
        break;
        
      case 'image':
        const img = document.createElement('img');
        img.src = block.src;
        img.alt = block.alt || '';
        
        if (block.caption) {
          const figure = document.createElement('figure');
          figure.appendChild(img);
          
          const figcaption = document.createElement('figcaption');
          figcaption.textContent = block.caption;
          
          figure.appendChild(figcaption);
          blockElement.appendChild(figure);
        } else {
          blockElement.appendChild(img);
        }
        break;
        
      case 'tip':
        const tipIcon = document.createElement('div');
        tipIcon.className = 'tip__icon';
        tipIcon.textContent = block.icon || '💡';
        
        const tipContent = document.createElement('div');
        tipContent.className = 'tip__content';
        tipContent.innerHTML = block.content;
        
        blockElement.appendChild(tipIcon);
        blockElement.appendChild(tipContent);
        break;
        
      case 'example':
        const exampleTitle = document.createElement('h3');
        exampleTitle.className = 'example__title';
        exampleTitle.textContent = block.title || t('module.example');
        
        const exampleContent = document.createElement('div');
        exampleContent.className = 'example__content';
        exampleContent.innerHTML = block.content;
        
        blockElement.appendChild(exampleTitle);
        blockElement.appendChild(exampleContent);
        break;
        
      case 'table':
        const table = document.createElement('table');
        
        // Add caption if provided
        if (block.caption) {
          const caption = document.createElement('caption');
          caption.textContent = block.caption;
          table.appendChild(caption);
        }
        
        // Add header if provided
        if (block.header) {
          const thead = document.createElement('thead');
          const headerRow = document.createElement('tr');
          
          block.header.forEach(cell => {
            const th = document.createElement('th');
            th.innerHTML = cell;
            headerRow.appendChild(th);
          });
          
          thead.appendChild(headerRow);
          table.appendChild(thead);
        }
        
        // Add body
        const tbody = document.createElement('tbody');
        
        block.rows.forEach(row => {
          const tr = document.createElement('tr');
          
          row.forEach(cell => {
            const td = document.createElement('td');
            td.innerHTML = cell;
            tr.appendChild(td);
          });
          
          tbody.appendChild(tr);
        });
        
        table.appendChild(tbody);
        blockElement.appendChild(table);
        break;
        
      default:
        // Unknown block type, render as plain text
        blockElement.textContent = JSON.stringify(block);
    }
    
    return blockElement;
  }
  
  /**
   * Update notifications display
   * 
   * @param {Array} notifications - Notifications array
   * @private
   */
  updateNotifications(notifications) {
    if (!notifications || notifications.length === 0) return;
    
    // Get the most recent notification
    const latestNotification = notifications[notifications.length - 1];
    
    const notificationElement = document.getElementById('notification');
    const messageElement = notificationElement.querySelector('.notification__message');
    const iconElement = notificationElement.querySelector('.notification__icon');
    
    // Update notification content
    messageElement.textContent = latestNotification.message;
    iconElement.textContent = latestNotification.icon || '📢';
    
    // Add appropriate class based on notification type
    notificationElement.className = 'notification';
    if (latestNotification.type) {
      notificationElement.classList.add(`notification--${latestNotification.type}`);
    }
    
    // Show notification
    notificationElement.setAttribute('aria-hidden', 'false');
    
    // Hide notification after 5 seconds
    setTimeout(() => {
      notificationElement.setAttribute('aria-hidden', 'true');
      
      // Remove notification from state after it's hidden
      setTimeout(() => {
        // Only remove if it's still the same notification
        const currentNotifications = this.stateManager.getState('notifications') || [];
        if (currentNotifications.length > 0 && 
            currentNotifications[currentNotifications.length - 1].id === latestNotification.id) {
          this.stateManager.setState(
            'notifications',
            currentNotifications.filter(n => n.id !== latestNotification.id)
          );
        }
      }, 300); // Wait for fade-out animation
    }, 5000);
  }
  
  /**
   * Show achievement modal
   * 
   * @param {Object} badge - Badge data
   * @param {number} points - Points awarded
   */
  showAchievementModal(badge, points) {
    const modal = document.getElementById('achievement-modal');
    const titleElement = document.getElementById('achievement-title');
    const nameElement = modal.querySelector('.achievement__name');
    const descriptionElement = modal.querySelector('.achievement__description');
    const pointsElement = modal.querySelector('.achievement__points');
    const iconElement = modal.querySelector('.achievement__icon');
    
    // Update modal content
    titleElement.textContent = t('achievement.earned');
    nameElement.textContent = badge.name;
    descriptionElement.textContent = badge.description;
    pointsElement.textContent = t('achievement.points', { points });
    iconElement.textContent = badge.icon || '🏆';
    
    // Show modal
    modal.setAttribute('aria-hidden', 'false');
  }
}