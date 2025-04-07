/**
 * Navigation Component
 * Handles navigation functionality and active menu items
 * 
 * @module components/navigation
 */

export class Navigation {
    /**
     * Create a new Navigation instance
     * 
     * @param {Object} stateManager - The application state manager
     */
    constructor(stateManager) {
      this.stateManager = stateManager;
      this.activeLink = null;
      this.mobileMenuOpen = false;
      
      // Initialize navigation
      this.init();
    }
    
    /**
     * Initialize navigation events and state
     */
    init() {
      // Set up event listeners for navigation links
      document.querySelectorAll('.nav__link').forEach(link => {
        link.addEventListener('click', this.handleNavClick.bind(this));
      });
      
      // Set up mobile menu toggle
      const menuToggle = document.querySelector('.nav__toggle');
      if (menuToggle) {
        menuToggle.addEventListener('click', this.toggleMobileMenu.bind(this));
      }
      
      // Listen for state changes to sync navigation state
      this.stateManager.subscribe('currentPage', (pageId) => {
        this.updateActiveLink(pageId);
      });
      
      // Initialize active link based on current page
      const currentPage = this.stateManager.getState('currentPage') || 'home';
      this.updateActiveLink(currentPage);
    }
    
    /**
     * Handle navigation link clicks
     * 
     * @param {Event} event - Click event
     */
    handleNavClick(event) {
      event.preventDefault();
      const link = event.currentTarget;
      const pageId = link.dataset.page;
      
      if (pageId) {
        // Update state to show the selected page
        this.stateManager.setState('currentPage', pageId);
        
        // Update URL hash
        window.history.pushState(null, '', `#${pageId}`);
        
        // Close mobile menu if open
        if (this.mobileMenuOpen) {
          this.toggleMobileMenu();
        }
      }
    }
    
    /**
     * Toggle mobile menu visibility
     */
    toggleMobileMenu() {
      const menuToggle = document.querySelector('.nav__toggle');
      const menu = document.querySelector('.nav__menu');
      
      if (!menuToggle || !menu) return;
      
      this.mobileMenuOpen = !this.mobileMenuOpen;
      menuToggle.setAttribute('aria-expanded', this.mobileMenuOpen);
      
      if (this.mobileMenuOpen) {
        menu.classList.add('nav__menu--open');
      } else {
        menu.classList.remove('nav__menu--open');
      }
    }
    
    /**
     * Update active navigation link
     * 
     * @param {string} pageId - ID of the active page
     */
    updateActiveLink(pageId) {
      // Remove active class from previous active link
      document.querySelectorAll('.nav__link').forEach(link => {
        link.classList.remove('nav__link--active');
        link.setAttribute('aria-current', 'false');
      });
      
      // Add active class to new active link
      const activeLink = document.querySelector(`.nav__link[data-page="${pageId}"]`);
      if (activeLink) {
        activeLink.classList.add('nav__link--active');
        activeLink.setAttribute('aria-current', 'page');
        this.activeLink = activeLink;
      }
    }
    
    /**
     * Navigate to a specific page
     * 
     * @param {string} pageId - ID of the page to navigate to
     */
    navigateTo(pageId) {
      if (document.getElementById(pageId)) {
        this.stateManager.setState('currentPage', pageId);
        window.history.pushState(null, '', `#${pageId}`);
      }
    }
  }