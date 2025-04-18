/**
 * Main application file for Splitting Coach
 * Entry point for the application
 * 
 * @author Kamil
 * @version 1.0.0
 */

// Import modules
import { initI18n, getCurrentLanguage, setLanguage, translate } from './modules/i18n.js';
import { StateManager } from './modules/stateManager.js';
import { UIController } from './modules/uiController.js';
import { ModuleLoader } from './modules/moduleLoader.js';
import { GamificationSystem } from './modules/gamification.js';
import { Navigation } from './components/navigation.js';
import { ProgressTracker } from './components/progressTracker.js';
import { Quiz } from './components/quiz.js';

// Initialize the application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp);

/**
 * Initialize the application
 * Sets up all required modules and event listeners
 */
async function initApp() {
  try {
    // Initialize state manager
    const stateManager = new StateManager();
    window.stateManager = stateManager; // Makes it accessible from other modules if needed

    // Initialize internationalization
    await initI18n();
    
    // Initialize UI Controller
    const uiController = new UIController(stateManager);
    stateManager.setUIController(uiController);
    
    // Initialize Module Loader
    const moduleLoader = new ModuleLoader(stateManager);
    stateManager.setModuleLoader(moduleLoader);
    
    // Initialize Gamification System
    const gamificationSystem = new GamificationSystem(stateManager);
    
    // Initialize Navigation
    const navigation = new Navigation(stateManager);
    
    // Initialize Progress Tracker
    const progressTracker = new ProgressTracker(stateManager);
    
    // Initialize Quiz
    const quiz = new Quiz(stateManager);
    
    // Apply initial translations based on saved language or browser default
    document.documentElement.lang = getCurrentLanguage();
    translate();
    
    // Load initial data
    await Promise.all([
      moduleLoader.loadModulesData(),
      gamificationSystem.loadBadgesData(),
      loadCheatsheetData()
    ]);
    
    // Render initial UI
    uiController.renderInitialUI();
    
    // Set up event listeners
    setupEventListeners(uiController, moduleLoader);
    
    // Show appropriate page based on URL hash if present
    handleInitialNavigation(uiController);
    
    console.log('Application initialized successfully');
  } catch (error) {
    console.error('Error initializing application:', error);
    showErrorMessage('Wystąpił błąd podczas inicjalizacji aplikacji. Proszę odświeżyć stronę.');
  }
}

/**
 * Load cheatsheet data from markdown file
 * 
 * @returns {Promise} A promise that resolves when cheatsheet is loaded
 */
async function loadCheatsheetData() {
  try {
    const response = await fetch('bpd_splitting_cheatsheet.md');
    if (!response.ok) {
      throw new Error('Failed to load cheatsheet data');
    }
    
    const markdown = await response.text();
    
    // Store in state for later use
    window.stateManager.setState('cheatsheet', markdown);
    
    return markdown;
  } catch (error) {
    console.error('Error loading cheatsheet data:', error);
    return null;
  }
}

/**
 * Set up all event listeners for the application
 * 
 * @param {UIController} uiController - The UI controller instance
 * @param {ModuleLoader} moduleLoader - The module loader instance
 */
function setupEventListeners(uiController, moduleLoader) {
  // Navigation
  document.querySelectorAll('.nav__link, .hero__cta').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = e.currentTarget.dataset.page;
      uiController.showPage(page);
      window.history.pushState(null, '', `#${page}`);
    });
  });
  
  // Mobile menu toggle
  const menuToggle = document.querySelector('.nav__toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', !isExpanded);
      document.querySelector('.nav__menu').classList.toggle('nav__menu--open');
    });
  }
  
  // Language switcher
  document.querySelectorAll('.language-switcher__btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const lang = e.currentTarget.dataset.lang;
      setLanguage(lang);
      document.documentElement.lang = lang;
      translate();
      
      // Update active state
      document.querySelectorAll('.language-switcher__btn').forEach(el => {
        el.setAttribute('data-active', el.dataset.lang === lang ? 'true' : 'false');
      });
    });
  });
  
  // Set initial language button state
  const currentLang = getCurrentLanguage();
  document.querySelectorAll('.language-switcher__btn').forEach(btn => {
    btn.setAttribute('data-active', btn.dataset.lang === currentLang ? 'true' : 'false');
  });
  
  // Module clicks
  document.querySelectorAll('.module-card__cta').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const moduleId = e.currentTarget.dataset.module;
      moduleLoader.openModule(moduleId);
      uiController.showPage('module-content');
    });
  });
  
  // Back to modules button
  document.querySelector('.module-nav__back').addEventListener('click', () => {
    uiController.showPage('modules');
  });
  
  // Module navigation buttons
  document.querySelector('.module-navigation__prev').addEventListener('click', () => {
    moduleLoader.navigateToPreviousLesson();
  });
  
  document.querySelector('.module-navigation__next').addEventListener('click', () => {
    moduleLoader.navigateToNextLesson();
  });
  
  // FAQ accordion
  document.addEventListener('click', (e) => {
    if (e.target.matches('.faq-item__question') || e.target.closest('.faq-item__question')) {
      const question = e.target.matches('.faq-item__question') 
        ? e.target 
        : e.target.closest('.faq-item__question');
      
      const isExpanded = question.getAttribute('aria-expanded') === 'true';
      question.setAttribute('aria-expanded', !isExpanded);
      
      // Adjust max-height of answer
      const answer = question.nextElementSibling;
      if (answer && answer.classList.contains('faq-item__answer')) {
        if (!isExpanded) {
          answer.style.maxHeight = answer.scrollHeight + 'px';
        } else {
          answer.style.maxHeight = '0';
        }
      }
    }
  });
  
  // Notification close button
  document.querySelector('.notification__close').addEventListener('click', () => {
    document.getElementById('notification').setAttribute('aria-hidden', 'true');
  });
  
  // Achievement modal close button
  document.querySelector('.achievement__close').addEventListener('click', () => {
    document.getElementById('achievement-modal').setAttribute('aria-hidden', 'true');
  });
  
  // Modal overlay click to close
  document.querySelector('.modal__overlay').addEventListener('click', () => {
    document.getElementById('achievement-modal').setAttribute('aria-hidden', 'true');
  });
  
  // Handle browser back/forward buttons
  window.addEventListener('popstate', () => {
    handleInitialNavigation(uiController);
  });
}

/**
 * Handle initial navigation based on URL hash
 * 
 * @param {UIController} uiController - The UI controller instance
 */
function handleInitialNavigation(uiController) {
  const hash = window.location.hash.substring(1);
  if (hash && document.getElementById(hash)) {
    uiController.showPage(hash);
  } else {
    uiController.showPage('home');
    window.history.replaceState(null, '', '#home');
  }
}

/**
 * Show error message to the user
 * 
 * @param {string} message - The error message to display
 */
function showErrorMessage(message) {
  const notification = document.getElementById('notification');
  const notificationMessage = notification.querySelector('.notification__message');
  const notificationIcon = notification.querySelector('.notification__icon');
  
  notificationMessage.textContent = message;
  notificationIcon.textContent = '⚠️';
  notification.classList.add('notification--error');
  notification.setAttribute('aria-hidden', 'false');
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    notification.setAttribute('aria-hidden', 'true');
  }, 5000);
}