// SEOJuice Suggestions Script
// Read more at https://seojuice.io/
// This script fetches SEO suggestions from SEOJuice and applies them to the page.

const SEOJuice = {
  init() {
    if (window.loadedSeojuice) return;
    window.loadedSeojuice = true;

    const currentPageUrl = this.cleanUrl(window.location.href);
    this.fetchSuggestions(currentPageUrl);
    window.loadedSeojuice = false;
  },

  cleanUrl(url) {
    // List of URL parameters to remove
    const parametersToRemove = [
      'utm_.*?',
      'campaign_id=.*?',
      'cid=.*?',
      'lid=.*?',
      '_pos=.*?',
      'add-to-cart=.*?',
      'logged_in=.*?',
      '_sid=.*?',
      'offer=.*?',
      't=.*?',
      'sscid=.*?',
      '_kx=.*?',
      'email=.*?',
      'rdt_cid=.*?',
      'rdt_uid=.*?',
      'rdt_sid=.*?',
      'timestamp=.*?',
      'orderby=.*?',
      'ad_group_id=.*?',
      'filter_product_brand=.*?',
      'filtering=.*?',
      'filter_brand=.*?',
      'gclid=.*?',
      'fbclid=.*?',
      'theme=.*?',
      'source=.*?',
      'gad_source=.*?',
      'msclkid=.*?',
      'gbraid=.*?'
    ];

    // Regex pattern with all parameters to NOT send them to SEOJuice
    const pattern = `(?<=&|\\?)(${parametersToRemove.join('|')})(&|$)`;
    
    // Remove matching parameters from URL
    return url.replace(new RegExp(pattern, 'igm'), '');
  },

  showError(text) {
    console.warn('[SeoJuice] Error:', text);
  },

  fetchSuggestions(url) {
    fetch('http://127.0.0.1:6785/test_data')
      .then(response => response.json())
      .then(this.processSuggestions.bind(this))
      .catch(this.showError);
  },

  processSuggestions(data) {
    const processSuggestion = (data) => {
      var { id, id_page, status, type, selector, old, _new, ignore_case } = data;
      _new = data.new;
      if (!status) {
        return;
      }

      if (type === "keyword" || type === "content") {
        this.processContent(
          selector, 
          old, 
          _new, 
          ignore_case, 
          data.force_set,
          data.attribute_to_update
        );
      } else if (type === "image") {
        this.processImageAlt(
          selector, 
          old,
          _new
        );
      } else if (type === "internal_link" || type === "external_link") {
        this.processLinks(
          selector,
          old,
          _new,
          type === "internal_link" ? true : false,
          data.force_set
        )
      } else {
        console.error(
          `Wrong type of data: ${data}`
        );
      }
    }

    data.forEach(processSuggestion)
    window.loadedSeojuice = false;
    return;

    const { errors, base, isAsian, insert_into_content_only, suggestions, images, accessibility, custom_link_class, metaTags } = data;

    if (errors.length > 0) {
      errors.forEach(this.showError);
      return;
    }
    
    this.updateMetaTags(metaTags);
    this.processLinks(suggestions, isAsian, insert_into_content_only, custom_link_class);
    this.processImages(images);
    this.processAccessibilityElements(accessibility);

    window.loadedSeojuice = false;
  },

  processContent(selector, old_data, new_data, ignoreCase, forceReplaceContent, attributeToUpdate) {
    var alreadyReplaced = new Set();
    /**
    * Обновляет указанный HTML элементы если они содержат указанное ключевое слово.
    * @param {HTMLElement} element - HTML элемент для обновления.
    */
    const updateElement = (element) => {
      this.replaceText(
        element, 
        old_data, 
        new_data, 
        true, 
        ignoreCase, 
        alreadyReplaced, 
        forceReplaceContent,
        attributeToUpdate
      );
    }

    if (!selector) {
      selector = "*"
    }
    const element = document.querySelectorAll(selector);
    element.forEach(updateElement);
  },

  processImageAlt(selector, old_alt, new_alt) {
    /**
    * Обновляет указанный HTML элементы если они содержат указанное ключевое слово.
    * @param {HTMLElement} element - HTML элемент для обновления.
    */
    const updateElement = (element) => {
      element.alt = new_alt;
    }

    if (!selector) {
      selector = "img"
    }
    const element = document.querySelectorAll(selector);
    element.forEach(updateElement);
  },

  processLinks(selector, old_data, new_data, isInternal, forceSet) {
    /**
    * Обновляет указанный HTML элемент если он содержит указанное ключевое слово.
    * @param {HTMLElement} element - HTML элемент для обновления.
    */
    const updateElement = (element) => {
      if ( !element.href) {
        return
      }

      if (old_data && !forceSet && !element.href.includes(old_data)) {
        return
      }

      if (isInternal && (forceSet || element.href.includes(old_data))) {
        element.href = new_data;
      } else if (!isInternal && (forceSet || element.href.startsWith("http"))) {
        element.href = new_data;
      }
    }

    if (!selector) {
      selector = "[href]";
    }
    const elements = document.querySelectorAll(selector);
    elements.forEach(updateElement);
  },

  updateMetaTags({ og_title, og_description, og_url, meta_description, meta_keywords }) {
    const updateMetaTag = (selector, content) => {
      if (content) {
        let tag = document.querySelector(selector);
        if (tag) {
          tag.setAttribute('content', content);
        } else {
          tag = document.createElement('meta');
          const [attr, value] = selector.split('=');
          tag.setAttribute(attr.split('[')[1].replace(/]/g, ''), value.replace(/['"]/g, '').replace(/]/g, '').replace(/\]/g, ''));
          tag.setAttribute('content', content);
          document.head.appendChild(tag);
        }
      }
    };

    updateMetaTag('meta[property="og:title"]', og_title);
    updateMetaTag('meta[property="og:description"]', og_description);
    updateMetaTag('meta[property="og:url"]', og_url);
    updateMetaTag('meta[name="description"]', meta_description);
    updateMetaTag('meta[name="keywords"]', meta_keywords);
  },

  // processLinks(links, isAsian, insertIntoContentOnly, custom_link_class) {
  //   if (!Array.isArray(links)) return;

  //   const contentOnlyTags = '.content, .article, .prose, .article-section, .content-area, .post-content, .elementor-widget-container, .elementor-widget-theme-post-content, .blog-post, .article-body, .spnc-post-content, .articlebody, .entry-content, .detail-description';
  //   const alreadyReplaced = new Set();
  //   links.forEach(link => {
  //     const el = document.createElement('a');
  //     el.href = link.url;
  //     el.innerText = link.keyword;
  //     if (custom_link_class) {
  //       el.className = custom_link_class;
  //     }

  //     this.replaceText(document.body, link.keyword, el, isAsian, insertIntoContentOnly, contentOnlyTags, alreadyReplaced);
  //   });
  // },

  replaceText(node, keyword, newText, isAsian, ignoreCase, alreadyReplaced, forceSet, attributeToUpdate) {
    var walker;
    if (!attributeToUpdate || attributeToUpdate === "TEXT") {
      walker = document.createTreeWalker(
        node,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function(node) {
            const parent = node.parentNode;
            const grandparent = parent.parentNode;
            
            // Check for .link class
            if (node.classList?.contains('link') || parent.classList?.contains('link') || grandparent.classList?.contains('link')) {
              return NodeFilter.FILTER_REJECT;
            }
            
            // Check unwanted tags
            var unwantedTags = ["H1", "H2", "H3", "H4", "H5", "A", "CANVAS", "TABLE", "IMG", "FIGCAPTION", "SCRIPT"];
            var unwantedTags = ["CANVAS", "TABLE", "FIGCAPTION", "SCRIPT"];
            if (unwantedTags.includes(parent.tagName) || unwantedTags.includes(grandparent.tagName)) {
              return NodeFilter.FILTER_REJECT;
            }
            
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );
    } else {
      walker = document.createTreeWalker(
        node,
        NodeFilter.SHOW_ALL,
        {
            acceptNode: function(node) {
              // Проверяем, есть ли у узла нужный атрибут
              if (node.hasAttribute(attributeName)) {
                  return NodeFilter.FILTER_ACCEPT; // Принимаем узел, если атрибут найден
              }
              return NodeFilter.FILTER_SKIP; // Пропускаем узел, если атрибут не найден
            }
        }
    );
    }

    var regex = null;
    if (!forceSet) {
      // Normalize the keyword to handle UTF-8 characters
      const plainTextPhrase = new DOMParser().parseFromString(keyword, 'text/html').body.textContent || "";
      const escapedPlainTextPhrase = plainTextPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      regex = isAsian
        ? new RegExp(
          `(?<=[\\p{IsHan}\\p{IsBopo}\\p{IsHira}\\p{IsKatakana}]?)${escapedPlainTextPhrase}[\\.{!\\?}(|\\]\\\\]?(?![a-zA-Z])(?=[\\)\\/]?)`, 
          ignoreCase ? 'i' : ''
        )
        : new RegExp(
          `(?<=^|\\s|[([{<"'В«вЂ№вЂћ"'|/]|\\-|:|'|'|')` +
          `${escapedPlainTextPhrase}` +
          `(?=$|\\s|[)\\]}>"'В»вЂє"'|/]|\\-|[.,:;!?]|'|'|')`,
          ignoreCase ? 'gi' : 'g'
        );
    }

    var currentNode = walker.currentNode;
    while (currentNode) {
      // if (alreadyReplaced.has(keyword.toLowerCase())) return;

      if (currentNode === document.documentElement) {
        currentNode = walker.nextNode();
        continue
      }

      if (forceSet && !attributeToUpdate) {
        this.replaceTextNodeOnly(currentNode, keyword, newText, true, ignoreCase);
        // alreadyReplaced.add(keyword.toLowerCase());
        // return;
      }

      if (attributeToUpdate) {
        var value = currentNode.getAttribute(attributeToUpdate);
        if (!keyword || this.isCompleteWordOrPhrase(value, keyword)) {
          var replacement;
          if (forceSet) {
            replacement = newText;
          } else {
            let flags = ignoreCase ? 'gi' : 'g';
            let pattern = new RegExp(keyword, flags);
            replacement = value.replaceAll(pattern, newText)
          }
          currentNode.setAttribute(attributeToUpdate, replacement)
          // alreadyReplaced.add(keyword.toLowerCase());
          // return;
        }

        currentNode = walker.nextNode();
        continue;
      }

      const match = currentNode.textContent.match(regex);
      if (match) {
        const matchedText = match[0];
        const anchorIndex = matchedText.toLowerCase().indexOf(keyword.toLowerCase());

        if (anchorIndex !== -1) {
          if (this.isCompleteWordOrPhrase(matchedText, keyword)) {
            this.replaceTextNodeOnly(currentNode, keyword, newText, false, ignoreCase)
            // alreadyReplaced.add(keyword.toLowerCase());
            // return;
          }
        }
      };

      currentNode = walker.nextNode();
    }
  },

  walkAroundDOMTree(walker, replaceCallback) {},

  replaceTextNodeOnly(element, oldText, newText, forceSet, ignoreCase) {
    // Получаем все дочерние узлы элемента
    const childNodes = Array.from(element.childNodes);

    if (!childNodes || childNodes.length === 0) {
      if (forceSet) {
        element.textContent = newText;
      } else {
        let flags = ignoreCase ? 'gi' : 'g';
        let pattern = new RegExp(oldText, flags);
        element.textContent = element.textContent.replaceAll(pattern, newText);
      }
    }

    childNodes.forEach(node => {
        // Проверяем, является ли узел текстовым
        if (node.nodeType === Node.TEXT_NODE) {
            // Если текст узла содержит старый текст, заменяем его
            if (node.textContent.includes(oldText)) {
                // Создаем паттерн с учетом `ignoreCase` параметра
                let flags = ignoreCase ? 'gi' : 'g';
                let pattern = new RegExp(oldText, flags);

                // Создаем новый текстовый узел с новым текстом
                const newTextNode = document.createTextNode(node.textContent.replaceAll(pattern, newText));
                // Заменяем старый текстовый узел на новый
                element.replaceChild(newTextNode, node);
            }
        }
    });
  },

  isCompleteWordOrPhrase(matchedText, keyword) {
    const trimmedMatch = matchedText.toLowerCase().trim();
    return trimmedMatch === keyword.toLowerCase() ||
            ['.', ',', '!', ')', '?', '"', 'вЂ™'].includes(trimmedMatch.slice(-1));
  },

  replaceTextWithLink(textNode, matchedText, anchorIndex, keyword, link) {
    const matchIndex = textNode.textContent.indexOf(matchedText);
    const newLink = link.cloneNode(true);
    const afterLink = textNode.splitText(matchIndex + anchorIndex);
    afterLink.textContent = afterLink.textContent.substring(keyword.length);
    textNode.parentNode.insertBefore(newLink, afterLink);
  },

  processImages(images) {
    if (!Array.isArray(images)) return;

    // Get all images once upfront
    const imgElements = document.querySelectorAll('img');

    // Create a Map for O(1) lookups
    const imageMap = new Map(images.map(img => [img.url, img.alt_text]));
    
    const checkUrl = (url) => {
      // Strip query string from URL
      url = url.split('?')[0];
      
      // Try the original URL first
      if (imageMap.has(url)) return imageMap.get(url);
      
      // If URL starts with https:, try without it
      if (url.startsWith('https:')) {
        const withoutProtocol = `//${url.substring(8)}`;
        return imageMap.has(withoutProtocol) ? imageMap.get(withoutProtocol) : null;
      }
      
      // If URL starts with //, try with https:
      if (url.startsWith('//')) {
        const withProtocol = `https:${url}`;
        return imageMap.has(withProtocol) ? imageMap.get(withProtocol) : null;
      }
      
      return null;
    };
    
    imgElements.forEach(img => {

      // Check src
      const altFromSrc = checkUrl(img.src);
      if (altFromSrc) {
        img.alt = altFromSrc;
        return;
      }

      // Check srcset if exists
      if (img.srcset) {
        const srcsetUrls = img.srcset.split(',').map(s => s.trim().split(' ')[0]);
        for (const url of srcsetUrls) {
          const altFromSrcset = checkUrl(url);
          if (altFromSrcset) {
            img.alt = altFromSrcset;
            break;
          }
        }
      }
    });
  },

  processAccessibilityElements(accessibilityData) {
    if (!Array.isArray(accessibilityData)) return;

    accessibilityData.forEach(element => {
      const { raw_tag, tag_id, class_names, aria_label, element_hash } = element;

      // Try to find the element using various selectors
      let targetElement = null;

      // Parse the raw_tag to extract attributes
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = raw_tag;
      const parsedElement = tempDiv.firstElementChild;

      if (parsedElement) {
        const tagName = parsedElement.tagName.toLowerCase();
        const attributes = Array.from(parsedElement.attributes)
          .map(attr => `[${attr.name}="${attr.value}"]`)
          .join('');

        try {
          // Create a specific selector based on the parsed element
          const selector = `${tagName}${attributes}`;
          targetElement = document.querySelector(selector);
        } catch (e) {
          return;
        }

        // If not found, try a more lenient selector
        if (!targetElement) {
          const lenientSelector = `${tagName}[name="${parsedElement.getAttribute('name')}"]`;
          targetElement = document.querySelector(lenientSelector);
        }
      }

      // If still not found, try the previous methods
      if (!targetElement && tag_id) {
        targetElement = document.getElementById(tag_id);
      }
      if (!targetElement && class_names) {
        targetElement = document.querySelector(`.${class_names.split(' ').join('.')}`);
      }

      if (targetElement) {
        this.improveAccessibility(targetElement, aria_label);
      }
    });
  },

  improveAccessibility(element, suggestedAriaLabel) {
    if (!element.getAttribute('aria-label') && suggestedAriaLabel) {
      element.setAttribute('aria-label', suggestedAriaLabel);
    }

    // Improve form controls
    if (element.tagName === 'INPUT' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA') {
      if (!element.getAttribute('id')) {
        const uniqueId = `seojuice-${Math.random().toString(36).substr(2, 9)}`;
        element.setAttribute('id', uniqueId);
      }
      if (!element.getAttribute('aria-label')) {
        element.setAttribute('aria-label', suggestedAriaLabel || element.placeholder || element.name || 'Input field');
      }
    }

    // Improve links
    if (element.tagName === 'A' && !element.getAttribute('aria-label')) {
      element.setAttribute('aria-label', suggestedAriaLabel || 'Link');
    }

    // Improve buttons
    if (element.tagName === 'BUTTON' && !element.getAttribute('aria-label')) {
      element.setAttribute('aria-label', suggestedAriaLabel || 'Button');
    }
  }
};

function registerListeners() {
  if (typeof window === 'undefined') return;

  let currentPath;
  
  function handleRouteChange() {
    // Only trigger if the path has actually changed
    if (currentPath !== window.location.pathname) {
      currentPath = window.location.pathname;
      
      // Wait for the DOM to stabilize after route change
      setTimeout(() => {
        if (document.readyState === 'complete') {
          SEOJuice.init();
        } else {
          window.addEventListener('load', SEOJuice.init.bind(SEOJuice));
        }
      }, 200);
    }
  }

  // Handle client-side navigation
  const pushState = history.pushState;
  history.pushState = function() {
    pushState.apply(this, arguments);
    handleRouteChange();
  };

  // Handle browser back/forward
  window.addEventListener("popstate", handleRouteChange);

  // Handle initial load and prerender cases
  if (document.visibilityState === "prerender") {
    document.addEventListener("visibilitychange", function() {
      if (!currentPath && document.visibilityState === "visible") {
        handleRouteChange();
      }
    });
  } else {
    handleRouteChange();
  }
}

registerListeners();  