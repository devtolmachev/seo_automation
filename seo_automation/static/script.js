const SeoAutomationScript = {
  init() {
    if (window.loadedSeoAutomationScript) return;
    window.loadedSeoAutomationScript = true;

    let cssSection = document.createElement('style');
    cssSection.setAttribute("id", "helper")
    const css = `
      .hidden-dom-element {
        display: none
      }
      .visible {
        display: block;
      }
    `;
    cssSection.appendChild(document.createTextNode(css));
    document.body.classList.add('hidden-dom-element');
    document.head.appendChild(cssSection);

    const currentPageUrl = this.cleanUrl(window.location.href);
    this.fetchSuggestions(currentPageUrl);
    window.loadedSeoAutomationScript = false;
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

    // Regex pattern with all parameters to NOT send them to SeoAutomationScript
    const pattern = `(?<=&|\\?)(${parametersToRemove.join('|')})(&|$)`;
    
    // Remove matching parameters from URL
    return url.replace(new RegExp(pattern, 'igm'), '');
  },

  showError(text) {
    console.warn('[SeoAutomationScript] Error:', text);
  },

  fetchSuggestions(url) {
    let element = document.getElementById('seo_automator')
    let website_id = element.getAttribute('data-website-id')
    let app_version = element.getAttribute('data-app-version') || "prod"
    let path = window.location.pathname;
    fetch(
      `https://xano.rankauthority.com/api:ZnCZv4aQ/content_recommendations?status=true&website_id=${website_id}&app_version=${app_version}&page_id=${path}`
    )
      .then(response => response.json())
      .then((json) => {
        this.processSuggestions.bind(this)(json)
        var cssSection = document.getElementById('helper')
        document.head.removeChild(cssSection);
      })
      .catch(this.showError);
  },

  processSuggestions(data) {
    const processSuggestion = (data) => {
      var { id, id_page, status, type, selector, old, _new, ignore_case } = data;
      _new = data.new;
      if (!status) {
        return;
      };

      if (location.origin != id_page) {
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

    data.map((i) => {processSuggestion(i)});
    window.loadedSeoAutomationScript = false;
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
          }
        }
      };

      currentNode = walker.nextNode();
    }
  },

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
          SeoAutomationScript.init();
        } else {
          window.addEventListener('load', SeoAutomationScript.init.bind(SeoAutomationScript));
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