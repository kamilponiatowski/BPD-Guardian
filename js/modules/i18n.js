/**
 * Internationalization module
 * Handles translations and language switching
 * 
 * @module i18n
 */

// Default language
const DEFAULT_LANGUAGE = 'pl';

// Available languages
const AVAILABLE_LANGUAGES = ['pl', 'en'];

// Translations storage
let translations = {
  pl: {},
  en: {}
};

// Current language
let currentLanguage = DEFAULT_LANGUAGE;

/**
 * Initialize the internationalization module
 * Loads translation files and sets the initial language
 * 
 * @returns {Promise} A promise that resolves when translations are loaded
 */
export async function initI18n() {
  try {
    // Get saved language from localStorage or use browser language
    const savedLanguage = localStorage.getItem('language');
    const browserLanguage = navigator.language.split('-')[0];
    
    // Set current language based on saved preference, browser language, or default
    currentLanguage = savedLanguage || 
                      (AVAILABLE_LANGUAGES.includes(browserLanguage) ? browserLanguage : DEFAULT_LANGUAGE);
    
    // Load translations for all available languages
    const translationPromises = AVAILABLE_LANGUAGES.map(lang => 
      fetch(`lang/${lang}.json`)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to load ${lang} translations`);
          }
          return response.json();
        })
        .then(data => {
          translations[lang] = data;
        })
    );
    
    await Promise.all(translationPromises);
    
    // Save current language to localStorage
    localStorage.setItem('language', currentLanguage);
    
    return true;
  } catch (error) {
    console.error('Error initializing i18n:', error);
    // Fallback to empty translations if loading fails
    return false;
  }
}

/**
 * Get the current language
 * 
 * @returns {string} The current language code
 */
export function getCurrentLanguage() {
  return currentLanguage;
}

/**
 * Set the application language
 * 
 * @param {string} lang - The language code to set
 * @returns {boolean} Whether the language was successfully set
 */
export function setLanguage(lang) {
  if (!AVAILABLE_LANGUAGES.includes(lang)) {
    console.error(`Language ${lang} is not available`);
    return false;
  }
  
  currentLanguage = lang;
  localStorage.setItem('language', lang);
  return true;
}

/**
 * Get a translation by key
 * 
 * @param {string} key - The translation key in dot notation (e.g., 'app.title')
 * @param {Object} params - Parameters to substitute in the translation
 * @returns {string} The translated text
 */
export function getTranslation(key, params = {}) {
  // Split the key by dots to navigate through the translations object
  const keys = key.split('.');
  
  // Get translation from current language or fallback to default
  let translation = keys.reduce((obj, k) => obj && obj[k], translations[currentLanguage]);
  
  // Fallback to default language if translation not found
  if (translation === undefined) {
    translation = keys.reduce((obj, k) => obj && obj[k], translations[DEFAULT_LANGUAGE]);
  }
  
  // Fallback to key if translation not found in default language
  if (translation === undefined) {
    return key;
  }
  
  // Replace parameters in the translation
  if (params && Object.keys(params).length > 0) {
    return Object.entries(params).reduce((text, [param, value]) => {
      return text.replace(new RegExp(`{${param}}`, 'g'), value);
    }, translation);
  }
  
  return translation;
}

/**
 * Translate all elements with data-i18n attribute
 */
export function translate() {
  // Translate elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    
    // Check if element has data-i18n-param attribute for parameters
    let params = {};
    if (element.hasAttribute('data-i18n-param')) {
      const paramAttr = element.getAttribute('data-i18n-param');
      const paramPairs = paramAttr.split(',');
      
      paramPairs.forEach(pair => {
        const [param, valueAttr] = pair.trim().split(':');
        // If value is directly provided (param:value)
        if (valueAttr) {
          params[param] = valueAttr;
        } 
        // If only param name is provided, look for value in element's dataset
        else if (element.dataset[param]) {
          params[param] = element.dataset[param];
        }
      });
    }
    
    // Get translation
    const translation = getTranslation(key, params);
    
    // Update element content
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      if (element.type === 'placeholder') {
        element.placeholder = translation;
      } else {
        element.value = translation;
      }
    } else {
      element.textContent = translation;
    }
  });
  
  // Translate attributes (data-i18n-attr="attr:key")
  document.querySelectorAll('[data-i18n-attr]').forEach(element => {
    const attrValue = element.getAttribute('data-i18n-attr');
    const [attr, key] = attrValue.split(':');
    
    if (attr && key) {
      element.setAttribute(attr, getTranslation(key));
    }
  });
}

/**
 * Translation helper for dynamic content
 * 
 * @param {string} key - The translation key
 * @param {Object} params - Parameters to substitute in the translation
 * @returns {string} The translated text
 */
export function t(key, params = {}) {
  return getTranslation(key, params);
}