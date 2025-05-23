/**
 * Configuration object for SEO Automation
 */
const CONFIG = {
  API_ENDPOINT: 'https://xano.rankauthority.com/api:cHcCrEXd:v1/snippet_content_recommendations',
  PARAMETERS_TO_REMOVE: [
    'utm_.*?', 'campaign_id=.*?', 'cid=.*?', 'lid=.*?', '_pos=.*?',
    'add-to-cart=.*?', 'logged_in=.*?', '_sid=.*?', 'offer=.*?', 't=.*?',
    'sscid=.*?', '_kx=.*?', 'email=.*?', 'rdt_cid=.*?', 'rdt_uid=.*?',
    'rdt_sid=.*?', 'timestamp=.*?', 'orderby=.*?', 'ad_group_id=.*?',
    'filter_product_brand=.*?', 'filtering=.*?', 'filter_brand=.*?',
    'gclid=.*?', 'fbclid=.*?', 'theme=.*?', 'source=.*?', 'gad_source=.*?',
    'msclkid=.*?', 'gbraid=.*?'
  ],
  UNWANTED_TAGS: ['CANVAS', 'TABLE', 'FIGCAPTION', 'SCRIPT']
};

/**
 * SEO Automation class to handle dynamic content updates
 */
class SeoAutomation {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Initialize the SEO automation script
   * @returns {Promise<void>}
   */
  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      const currentPageUrl = this.cleanUrl(window.location.href);
      await this.fetchSuggestions(currentPageUrl);
    } catch (error) {
      this.showError('Initialization failed', error);
    } finally {
      this.isInitialized = false;
    }
  }

  /**
   * Clean URL by removing specified query parameters
   * @param {string} url - The URL to clean
   * @returns {string} Cleaned URL
   */
  cleanUrl(url) {
    if (!url || typeof url !== 'string') return url;
    const pattern = `(?<=[?&])(${CONFIG.PARAMETERS_TO_REMOVE.join('|')})(&|$)`;
    return url.replace(new RegExp(pattern, 'igm'), '');
  }

  /**
   * Log error messages to console
   * @param {string} message - Error message
   * @param {Error} [error] - Optional error object
   */
  showError(message, error) {
    console.warn(`[SeoAutomation] ${message}:`, error || '');
  }

  /**
   * Fetch SEO suggestions from the API
   * @param {string} pageUrl - The page URL to fetch suggestions for
   * @returns {Promise<void>}
   */
  async fetchSuggestions(pageUrl) {
    const element = document.getElementById('seo_automator');
    if (!element) {
      this.showError('SEO automator element not found');
      return;
    }

    const websiteId = element.dataset.websiteId;
    const appVersion = element.dataset.appVersion || 'live';
    const url = `${CONFIG.API_ENDPOINT}?website_id=${websiteId}&page_id=${pageUrl}`;
    const headers = { 'X-Data-Source': appVersion };

    try {
      const response = await fetch(url, { method: 'GET', headers });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const text = await response.text();
      const cleanedText = text
        .replace(/\\u003E/g, '>')
        .replace(/\\u003C/g, '<')
        .replace(/\\u0026/g, '&');
      const json = JSON.parse(cleanedText);
      await this.processSuggestions(json);
    } catch (error) {
      this.showError('Failed to fetch suggestions', error);
    }
  }

  /**
   * Process SEO suggestions
   * @param {Array<Object>} suggestions - Array of suggestion objects
   */
  async processSuggestions(suggestions) {
    if (!Array.isArray(suggestions)) {
      this.showError('Invalid suggestions data format');
      return;
    }

    for (const suggestion of suggestions) {
      if (!suggestion.status) continue;

      const { type, selector, old, new: newData, ignore_case, force_set, attribute_to_update, new_selector, replaceInnerHTML } = suggestion;

      try {
        switch (type) {
          case 'keyword':
          case 'metatag':
          case 'content':
            await this.processContent(selector, old, newData, ignore_case, force_set, attribute_to_update, new_selector, replaceInnerHTML);
            break;
          case 'image':
            await this.processImageAlt(selector, old, newData);
            break;
          case 'internal_link':
          case 'external_link':
            await this.processLinks(selector, old, newData, type === 'internal_link', force_set);
            break;
          default:
            this.showError(`Unsupported suggestion type: ${type}`, suggestion);
        }
      } catch (error) {
        this.showError(`Error processing suggestion (type: ${type})`, error);
      }
    }
  }

  /**
   * Process content updates (keywords, metatags, content)
   * @param {string} selector - CSS selector
   * @param {string} oldData - Data to replace
   * @param {string} newData - Replacement data
   * @param {boolean} ignoreCase - Case sensitivity flag
   * @param {boolean} forceSet - Force replacement flag
   * @param {string} attributeToUpdate - Attribute to update
   * @param {string} newSelector - New selector for moving element
   * @param {boolean} replaceInnerHTML - Replace innerHTML flag
   */
  async processContent(selector = '*', oldData, newData, ignoreCase, forceSet, attributeToUpdate, newSelector, replaceInnerHTML) {
    const alreadyReplaced = new Set();
    const elements = document.querySelectorAll(selector) || document.querySelectorAll('*');

    if (!elements.length && selector?.includes('head')) {
      const attributes = new Map([[attributeToUpdate, newData]]);
      this.createMetaTag(selector, newData, attributes);
      return;
    }

    for (const element of elements) {
      this.replaceText(element, oldData, newData, ignoreCase, alreadyReplaced, forceSet, attributeToUpdate, replaceInnerHTML, selector);
      if (newSelector) {
        await this.moveElement(element, newSelector);
      }
    }
  }

  /**
   * Move an element to a new location
   * @param {HTMLElement} element - Element to move
   * @param {string} newSelector - New selector for placement
   */
  async moveElement(element, newSelector) {
    const tagName = newSelector.split(/[\s.]+/).pop() || 'div';
    const newElement = document.createElement(tagName);

    Array.from(element.attributes).forEach((attr) => {
      if (attr.name !== 'class') newElement.setAttribute(attr.name, attr.value);
    });

    newElement.innerHTML = element.innerHTML;
    element.parentNode?.insertBefore(newElement, element.nextSibling) || document.body.appendChild(newElement);
    element.remove();
  }

  /**
   * Update image alt attributes
   * @param {string} selector - CSS selector
   * @param {string} oldAlt - Old alt text
   * @param {string} newAlt - New alt text
   */
  async processImageAlt(selector = 'img', oldAlt, newAlt) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      if (oldAlt && element.alt !== oldAlt) continue;
      element.alt = newAlt;
    }
  }

  /**
   * Update link href attributes
   * @param {string} selector - CSS selector
   * @param {string} oldData - Old href data
   * @param {string} newData - New href data
   * @param {boolean} isInternal - Internal link flag
   * @param {boolean} forceSet - Force replacement flag
   */
  async processLinks(selector = '[href]', oldData, newData, isInternal, forceSet) {
    const elements = document.querySelectorAll(selector) || document.querySelectorAll('[href]');
    for (const element of elements) {
      if (!element.href) continue;
      if (oldData && !forceSet && !element.href.includes(oldData)) continue;

      if (isInternal && (forceSet || element.href.includes(oldData))) {
        element.href = newData;
      } else if (!isInternal && (forceSet || element.href.startsWith('http'))) {
        element.href = newData;
      }
    }
  }

  /**
   * Create a meta tag
   * @param {string} selector - CSS selector
   * @param {string} data - Content for the meta tag
   * @param {Map} attributesToSet - Attributes to set
   * @returns {HTMLElement|null}
   */
  async createMetaTag(selector, data, attributesToSet) {
    const normalizedSelector = selector.trim().replace(/,\s*$/, '').replace(/\s+/g, ' ');
    const parts = normalizedSelector.split('>').map(part => part.trim().split(/\s+/).filter(Boolean)).flat();

    if (!parts.includes('head')) {
      this.showError(`Selector ${selector} does not contain "head" element`);
      return null;
    }

    const lastPart = parts[parts.length - 1];
    const tagMatch = lastPart.match(/^([a-zA-Z0-9-]+)(?:\[([^\]]+)\])?$/);
    if (!tagMatch) {
      this.showError(`Invalid selector format: ${lastPart}`);
      return null;
    }

    const elementToCreate = tagMatch[1];
    const parentSelector = parts.slice(0, -1).join(' > ') || 'html > head';
    const parentElement = document.querySelector(parentSelector);

    if (!parentElement) {
      this.showError(`Parent element not found for selector: ${parentSelector}`);
      return null;
    }

    const newElement = document.createElement(elementToCreate);
    for (const [key, value] of attributesToSet) {
      if (key && value) newElement.setAttribute(key, value);
    }

    if (tagMatch[2]) {
      const attrPairs = tagMatch[2].split('][').map(attr => attr.replace(/[\[\]]/g, ''));
      for (const pair of attrPairs) {
        const [name, value] = pair.split('=').map(s => s.replace(/"/g, ''));
        if (name && value) newElement.setAttribute(name, value);
      }
    }

    if (!newElement.hasAttribute('content')) {
      newElement.setAttribute('content', data);
    }

    parentElement.appendChild(newElement);
    return newElement;
  }

  /**
   * Replace text in nodes
   * @param {HTMLElement} node - DOM node
   * @param {string} keyword - Text to replace
   * @param {string} newText - Replacement text
   * @param {boolean} ignoreCase - Case sensitivity flag
   * @param {Set} alreadyReplaced - Set of replaced nodes
   * @param {boolean} forceSet - Force replacement flag
   * @param {string} attributeToUpdate - Attribute to update
   * @param {boolean} replaceInnerHTML - Replace innerHTML flag
   * @param {string} selectorOfElement - Selector for element
   * @returns {Array<HTMLElement>}
   */
  async replaceText(node, keyword, newText, ignoreCase, alreadyReplaced, forceSet, attributeToUpdate, replaceInnerHTML, selectorOfElement) {
    if (selectorOfElement && !attributeToUpdate && newText) {
      const element = document.querySelector(selectorOfElement);
      if (element) {
        element.textContent = newText;
        return [element];
      }
    }

    const walker = document.createTreeWalker(node, attributeToUpdate && attributeToUpdate !== 'TEXT' ? NodeFilter.SHOW_ALL : NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentNode;
        const grandparent = parent?.parentNode;

        if (
          node.classList?.contains('link') ||
          parent?.classList?.contains('link') ||
          grandparent?.classList?.contains('link') ||
          CONFIG.UNWANTED_TAGS.includes(parent?.tagName) ||
          CONFIG.UNWANTED_TAGS.includes(grandparent?.tagName)
        ) {
          return NodeFilter.FILTER_REJECT;
        }

        if (attributeToUpdate && attributeToUpdate !== 'TEXT' && !node.hasAttribute?.(attributeToUpdate)) {
          return NodeFilter.FILTER_SKIP;
        }

        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const regex = forceSet ? null : this.createRegex(keyword, ignoreCase);
    const foundElements = [];
    let currentNode = walker.currentNode;

    while (currentNode) {
      if (currentNode === document.documentElement) {
        currentNode = walker.nextNode();
        continue;
      }

      if (replaceInnerHTML || (forceSet && !attributeToUpdate)) {
        const elements = this.replaceTextNodeOnly(currentNode, keyword, newText, forceSet, ignoreCase, replaceInnerHTML);
        foundElements.push(...elements);
      } else if (attributeToUpdate && attributeToUpdate !== 'TEXT') {
        const value = currentNode.getAttribute(attributeToUpdate);
        if (value && (!keyword || this.isCompleteWordOrPhrase(value, keyword))) {
          const replacement = forceSet ? newText : value.replace(new RegExp(keyword, ignoreCase ? 'gi' : 'g'), newText);
          currentNode.setAttribute(attributeToUpdate, replacement);
          foundElements.push(currentNode);
        }
      } else if (regex && currentNode.textContent.match(regex)) {
        const matchedText = currentNode.textContent.match(regex)[0];
        if (this.isCompleteWordOrPhrase(matchedText, keyword)) {
          const elements = this.replaceTextNodeOnly(currentNode, keyword, newText, false, ignoreCase, replaceInnerHTML);
          foundElements.push(...elements);
        }
      }

      currentNode = walker.nextNode();
    }

    return foundElements;
  }

  /**
   * Replace text in a single node
   * @param {Node} element - DOM node
   * @param {string} oldText - Text to replace
   * @param {string} newText - Replacement text
   * @param {boolean} forceSet - Force replacement flag
   * @param {boolean} ignoreCase - Case sensitivity flag
   * @param {boolean} replaceInnerHTML - Replace innerHTML flag
   * @returns {Array<HTMLElement>}
   */
  replaceTextNodeOnly(element, oldText, newText, forceSet, ignoreCase, replaceInnerHTML) {
    const foundElements = [];
    if (replaceInnerHTML) {
      element.innerHTML = newText;
      foundElements.push(element);
      return foundElements;
    }

    const childNodes = Array.from(element.childNodes);
    if (!childNodes.length) {
      if (forceSet) {
        element.textContent = newText;
      } else {
        const pattern = new RegExp(oldText, ignoreCase ? 'gi' : 'g');
        element.textContent = element.textContent.replace(pattern, newText);
      }
      foundElements.push(element);
      return foundElements;
    }

    childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.includes(oldText)) {
        const pattern = new RegExp(oldText, ignoreCase ? 'gi' : 'g');
        const newTextNode = document.createTextNode(node.textContent.replace(pattern, newText));
        element.replaceChild(newTextNode, node);
        foundElements.push(element);
      }
    });

    return foundElements;
  }

  /**
   * Create regex for text replacement
   * @param {string} keyword - Keyword to match
   * @param {boolean} ignoreCase - Case sensitivity flag
   * @returns {RegExp|null}
   */
  createRegex(keyword, ignoreCase) {
    if (!keyword) return null;
    const plainTextPhrase = new DOMParser().parseFromString(keyword, 'text/html').body.textContent || '';
    const escapedPhrase = plainTextPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(
      `(?<=[\\p{IsHan}\\p{IsBopo}\\p{IsHira}\\p{IsKatakana}]?)${escapedPhrase}[\\.{!\\?}(|\\]\\\\]?(?![a-zA-Z])(?=[\\)\\/]?)`,
      ignoreCase ? 'i' : ''
    );
  }

  /**
   * Check if matched text is a complete word or phrase
   * @param {string} matchedText - Matched text
   * @param {string} keyword - Keyword to check
   * @returns {boolean}
   */
  isCompleteWordOrPhrase(matchedText, keyword) {
    const trimmedMatch = matchedText.toLowerCase().trim();
    return (
      trimmedMatch === keyword.toLowerCase() ||
      ['.', ',', '!', ')', '?', '"', '’'].includes(trimmedMatch.slice(-1))
    );
  }
}

/**
 * Register event listeners for route changes
 */
async function registerListeners() {
  if (typeof window === 'undefined') return;

  const seoAutomation = new SeoAutomation();
  let currentPath;

  const handleRouteChange = () => {
    if (currentPath === window.location.pathname) return;
    currentPath = window.location.pathname;

    setTimeout(async () => {
      if (document.readyState === 'complete') {
        await seoAutomation.init();
      } else {
        window.addEventListener('load', async () => await seoAutomation.init(), { once: true });
      }
    }, 200);
  };

  const originalPushState = history.pushState;
  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    handleRouteChange();
  };

  window.addEventListener('popstate', handleRouteChange);

  if (document.visibilityState === 'prerender') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !currentPath) {
        handleRouteChange();
      }
    }, { once: true });
  } else {
    handleRouteChange();
  }
}

registerListeners();