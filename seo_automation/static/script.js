const SeoAutomationScript = {
  init() {
    if (window.loadedSeoAutomationScript) return;
    window.loadedSeoAutomationScript = true;

    const currentPageUrl = this.cleanUrl(window.location.href);
    this.fetchSuggestions(currentPageUrl);
    window.loadedSeoAutomationScript = false;
  },

  cleanUrl(url) {
    // List of URL parameters to remove
    const parametersToRemove = [
      "utm_.*?",
      "campaign_id=.*?",
      "cid=.*?",
      "lid=.*?",
      "_pos=.*?",
      "add-to-cart=.*?",
      "logged_in=.*?",
      "_sid=.*?",
      "offer=.*?",
      "t=.*?",
      "sscid=.*?",
      "_kx=.*?",
      "email=.*?",
      "rdt_cid=.*?",
      "rdt_uid=.*?",
      "rdt_sid=.*?",
      "timestamp=.*?",
      "orderby=.*?",
      "ad_group_id=.*?",
      "filter_product_brand=.*?",
      "filtering=.*?",
      "filter_brand=.*?",
      "gclid=.*?",
      "fbclid=.*?",
      "theme=.*?",
      "source=.*?",
      "gad_source=.*?",
      "msclkid=.*?",
      "gbraid=.*?",
    ];

    // Regex pattern with all parameters to NOT send them to SeoAutomationScript
    const pattern = `(?<=&|\\?)(${parametersToRemove.join("|")})(&|$)`;

    // Remove matching parameters from URL
    return url.replace(new RegExp(pattern, "igm"), "");
  },

  showError(text) {
    console.warn("[SeoAutomationScript] Error:", text);
  },

  createJsonLdScript(object) {
    let script = document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.textContent = JSON.stringify(object);
  },

  fetchSuggestions(_) {
    let element = document.getElementById("seo_automator");
    let website_id = element.getAttribute("data-website-id");
    let app_version = element.getAttribute("data-app-version");
    let path = window.location.href;

    let header_value = "live";
    let url = `https://xano.rankauthority.com/api:cHcCrEXd:v1/snippet_content_recommendations?website_id=${website_id}&page_id=${path}`;
    if (app_version === "test") {
      header_value = "test";
      url = `https://xano.rankauthority.com/api:cHcCrEXd:v1/snippet_content_recommendations?website_id=${website_id}&page_id=${path}`;
    }

    fetch(
      url,
      {
        method: "GET",
        headers: { "X-Data-Source": header_value },
      },
    )
      .then(function (response) {
        return response.text();
      })
      .then((text) => {
        // clean response
        const cleanedText = text
          .replace(/\\u003E/g, ">")
          .replace(/\\u003C/g, "<")
          .replace(/\\u0026/g, "&");
        const json = JSON.parse(cleanedText);
        
        const recommendations = json["recommendations"];
        const jsonLdBody = json["json_ld"];
        
        if (Boolean(recommendations)) {
          this.processRecomendations.bind(this)(recommendations);
        }

        if (Boolean(jsonLdBody)) {
          this.createJsonLdScript.bind(this)(jsonLdBody);
        }
      })
      .catch(this.showError);
  },

  processRecomendations(data) {
    const processSuggestion = (data) => {
      var {
        id,
        id_page,
        status,
        type,
        selector,
        old,
        _new,
        ignore_case,
        new_selector,
      } = data;
      _new = data.new;
      if (!status) {
        return;
      }

      try {
        if (["keyword", "metatag", "content"].indexOf(type) >= 0) {
          this.processContent(
            selector,
            old,
            _new,
            ignore_case,
            data.force_set,
            data.attribute_to_update,
            type === "content" ? new_selector : null,
            data.replaceInnerHTML,
          );
        } else if (type === "image") {
          this.processImageAlt(selector, old, _new);
        } else if (type === "internal_link" || type === "external_link") {
          this.processLinks(
            selector,
            old,
            _new,
            type === "internal_link" ? true : false,
            data.force_set,
          );
        } else {
          console.warn(`Wrong type (${type}) of data: ${data}`);
        }
      } catch (e) {
        this.showError(e);
      }
    };
    if (!data.map) {
      window.loadedSeoAutomationScript = false
      return;
    }
    
    data.map((i) => {
      processSuggestion(i);
    });
    window.loadedSeoAutomationScript = false;
  },

  processContent(
    selector,
    old_data,
    new_data,
    ignoreCase,
    forceReplaceContent,
    attributeToUpdate,
    new_selector,
    replaceInnerHTML,
  ) {
    var alreadyReplaced = new Set();
    const updateElement = (element) => {
      this.replaceText(
        element,
        old_data,
        new_data,
        ignoreCase,
        alreadyReplaced,
        true,
        attributeToUpdate,
        replaceInnerHTML,
        selector
      );
      if (new_selector) {
        this.moveElement(element, new_selector);
      }
    };

    if (!selector) {
      selector = "*";
    }
    var element = document.querySelectorAll(selector);
    if (element.length == 0) {
      if (!selector) {
        selector = "*";
      }
      element = document.querySelectorAll(selector);
    }
    if (element.length === 0 && selector != null && selector.split('head').length > 1) {
      var key = `${attributeToUpdate}`;
      var attributesToSet = new Map();
      attributesToSet[key] = new_data;
      this.createMetaTag(selector, new_data, attributesToSet);
    } else {
      element.forEach(updateElement);
    }
  },

  moveElement(element, newSelector) {
    const selectorParts = newSelector.split(/[\s.]+/);

    const tagName = selectorParts[selectorParts.length - 1] || "div";
    const newElement = document.createElement(tagName);

    Array.from(element.attributes).forEach((attr) => {
      if (attr.name !== "class") {
        newElement.setAttribute(attr.name, attr.value);
      }
    });

    newElement.innerHTML = element.innerHTML;

    if (element.parentNode) {
      element.parentNode.insertBefore(newElement, element.nextSibling);
    } else {
      document.body.appendChild(newElement);
    }

    element.remove();
  },

  processImageAlt(selector, old_alt, new_alt) {
    const updateElement = (element) => {
      if (old_alt && element.alt != old_alt) {
        return;
      }
      element.alt = new_alt;
    };

    if (!selector) {
      selector = "img";
    }
    const element = document.querySelectorAll(selector);
    element.forEach(updateElement);
  },

  processLinks(selector, old_data, new_data, isInternal, forceSet) {
    const updateElement = (element) => {
      if (!element.href) {
        return;
      }

      if (old_data && !forceSet && !element.href.includes(old_data)) {
        return;
      }

      if (isInternal && (forceSet || element.href.includes(old_data))) {
        element.href = new_data;
      } else if (!isInternal && (forceSet || element.href.startsWith("http"))) {
        element.href = new_data;
      }
    };

    if (!selector) {
      selector = "[href]";
    }
    var elements = document.querySelectorAll(selector)
    if (elements.length == 0) {
      if (!selector) {
        selector = "[href]";
      }
      elements = document.querySelectorAll(selector);
    }

    elements.forEach(updateElement);
  },

  createMetaTag(selector, data, attributesToSet) {
    const normalizedSelector = selector.trim().replace(/,\s*$/, '').replace(/\s+/g, ' ');

    const parts = normalizedSelector.split('>').map(part => {
      // Разбиваем каждую часть по пробелу и фильтруем пустые элементы
      return part.trim().split(/\s+/).filter(Boolean);
    }).flat();

    if (parts.indexOf('head') === -1) {
      console.warn(`Селектор ${selector} не содержит "head" элемента`);
      return null;
    }

    if (parts.length < 1) {
      console.warn(`Некорректный селектор: "${selector}"`);
      return null;
    }

    const lastPart = parts[parts.length - 1];

    const tagMatch = lastPart.match(/^([a-zA-Z0-9-]+)(?:\[([^\]]+)\])?$/);
    if (!tagMatch) {
      console.warn(`Некорректный формат элемента в селекторе: "${lastPart}"`);
      return null;
    }

    const elementToCreate = tagMatch[1];

    const parentSelector = parts.slice(0, -1).join(' > ').trim() || 'html > head';

    const parentElement = document.querySelector(parentSelector);

    if (!parentElement) {
      console.warn(`Родительский элемент по селектору "${parentSelector}" не найден`);
      return null;
    }

    const newElement = document.createElement(elementToCreate);

    if (attributesToSet instanceof Map) {
      for (const [key, value] of attributesToSet) {
        if (key != undefined && value != undefined) {
          newElement.setAttribute(key, value);
        }
      }
    }

    if (tagMatch[2]) {
      const attrPairs = tagMatch[2].split('][').map(attr => attr.replace(/[\[\]]/g, ''));
      for (const pair of attrPairs) {
        const [name, value] = pair.split('=').map(s => s.replace(/"/g, ''));
        if (name && value) {
          newElement.setAttribute(name, value);
        }
      }
    }

    if (!newElement.hasAttribute('content')) {
      newElement.setAttribute('content', data);
    }

    parentElement.appendChild(newElement);

    return newElement;
  },

  replaceText(
    node,
    keyword,
    newText,
    ignoreCase,
    alreadyReplaced,
    forceSet,
    attributeToUpdate,
    replaceInnerHTML,
    selectorOfElement
  ) {


    if (selectorOfElement && forceSet && !attributeToUpdate && newText) {
      var element = document.querySelector(selectorOfElement);
      if (element) {
        element.textContent = newText;
        return;
      }
    }
    
    var walker;
    if (!attributeToUpdate || attributeToUpdate === "TEXT") {
      walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
        acceptNode: function (node) {
          const parent = node.parentNode;
          const grandparent = parent.parentNode;

          // Check for .link class
          if (
            node.classList?.contains("link") ||
            parent.classList?.contains("link") ||
            grandparent.classList?.contains("link")
          ) {
            return NodeFilter.FILTER_REJECT;
          }

          // Check unwanted tags
          var unwantedTags = [
            "H1",
            "H2",
            "H3",
            "H4",
            "H5",
            "A",
            "CANVAS",
            "TABLE",
            "IMG",
            "FIGCAPTION",
            "SCRIPT",
          ];
          var unwantedTags = ["CANVAS", "TABLE", "FIGCAPTION", "SCRIPT"];
          if (
            unwantedTags.includes(parent.tagName) ||
            unwantedTags.includes(grandparent.tagName)
          ) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        },
      });
    } else {
      walker = document.createTreeWalker(node, NodeFilter.SHOW_ALL, {
        acceptNode: function (node) {
          if (node.hasAttribute && node.hasAttribute(attributeToUpdate)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        },
      });
    }

    var regex = null;
    if (!forceSet) {
      // Normalize the keyword to handle UTF-8 characters
      const plainTextPhrase =
        new DOMParser().parseFromString(keyword, "text/html").body
          .textContent || "";
      const escapedPlainTextPhrase = plainTextPhrase.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );

      regex = new RegExp(
          `(?<=[\\p{IsHan}\\p{IsBopo}\\p{IsHira}\\p{IsKatakana}]?)${escapedPlainTextPhrase}[\\.{!\\?}(|\\]\\\\]?(?![a-zA-Z])(?=[\\)\\/]?)`,
          ignoreCase ? "i" : "",
        );
    }

    var currentNode = walker.currentNode;
    var foundElements = [];
    while (currentNode) {
      if (currentNode === document.documentElement) {
        currentNode = walker.nextNode();
        continue;
      }

      if (replaceInnerHTML) {
        var element = this.replaceTextNodeOnly(
          currentNode,
          keyword,
          newText,
          true,
          ignoreCase,
          replaceInnerHTML,
        );
        foundElements.push(...element);
      }

      if (forceSet && !attributeToUpdate) {
        var element = this.replaceTextNodeOnly(
          currentNode,
          keyword,
          newText,
          true,
          ignoreCase,
          replaceInnerHTML,
        );
        foundElements.push(...element);
      }

      if (!replaceInnerHTML && attributeToUpdate) {
        var value = currentNode.getAttribute(attributeToUpdate);
        if (value == null) {
          var element = this.replaceTextNodeOnly(
            currentNode,
            keyword,
            newText,
            true,
            ignoreCase,
          );
          foundElements.push(...element);
        } else {
          if (!keyword || this.isCompleteWordOrPhrase(value, keyword)) {
            var replacement;
            if (forceSet) {
              replacement = newText;
            } else {
              let flags = ignoreCase ? "gi" : "g";
              let pattern = new RegExp(keyword, flags);
              replacement = value.replaceAll(pattern, newText);
            }
            if (currentNode.setAttribute) {
              currentNode.setAttribute(attributeToUpdate, replacement);
              foundElements.push(currentNode);
            }
          }
        }

        currentNode = walker.nextNode();
        continue;
      }

      const match = currentNode.textContent.match(regex);
      if (match) {
        const matchedText = match[0];
        const anchorIndex = matchedText
          .toLowerCase()
          .indexOf(keyword.toLowerCase());

        if (anchorIndex !== -1) {
          if (this.isCompleteWordOrPhrase(matchedText, keyword)) {
            var element = this.replaceTextNodeOnly(
              currentNode,
              keyword,
              newText,
              false,
              ignoreCase,
              replaceInnerHTML,
            );
            foundElements.push(...element);
          }
        }
      }

      currentNode = walker.nextNode();
    }
    return foundElements;
  },

  replaceTextNodeOnly(
    element,
    oldText,
    newText,
    forceSet,
    ignoreCase,
    replaceInnerHTML,
  ) {
    const childNodes = Array.from(element.childNodes);
    var foundElements = [];
    if (!childNodes || childNodes.length === 0) {
      if (replaceInnerHTML) {
        element.innerHTML = newText;
        foundElements.push(element);
      } else if (forceSet) {
        element.textContent = newText;
        foundElements.push(element);
      } else {
        let flags = ignoreCase ? "gi" : "g";
        let pattern = new RegExp(oldText, flags);
        element.textContent = element.textContent.replaceAll(pattern, newText);
        foundElements.push(element);
      }
    }
    childNodes.forEach((node) => {
      if (replaceInnerHTML) {
        element.innerHTML = newText;
        foundElements.push(element);
      } else if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent.includes(oldText)) {
          let flags = ignoreCase ? "gi" : "g";
          let pattern = new RegExp(oldText, flags);

          const newTextNode = document.createTextNode(
            node.textContent.replaceAll(pattern, newText),
          );
          element.replaceChild(newTextNode, node);
          foundElements.push(element);
        }
      }
    });
    return foundElements;
  },

  isCompleteWordOrPhrase(matchedText, keyword) {
    const trimmedMatch = matchedText.toLowerCase().trim();
    return (
      trimmedMatch === keyword.toLowerCase() ||
      [".", ",", "!", ")", "?", '"', "вЂ™"].includes(trimmedMatch.slice(-1))
    );
  },
};

function registerListeners() {
  if (typeof window === "undefined") return;

  let currentPath;

  function handleRouteChange() {
    // Only trigger if the path has actually changed
    if (currentPath !== window.location.pathname) {
      currentPath = window.location.pathname;

      // Wait for the DOM to stabilize after route change
      setTimeout(() => {
        if (document.readyState === "complete") {
          SeoAutomationScript.init();
        } else {
          window.addEventListener(
            "load",
            SeoAutomationScript.init.bind(SeoAutomationScript),
          );
        }
      }, 200);
    }
  }

  // Handle client-side navigation
  const pushState = history.pushState;
  history.pushState = function () {
    pushState.apply(this, arguments);
    handleRouteChange();
  };

  // Handle browser back/forward
  window.addEventListener("popstate", handleRouteChange);

  // Handle initial load and prerender cases
  if (document.visibilityState === "prerender") {
    document.addEventListener("visibilitychange", function () {
      if (!currentPath && document.visibilityState === "visible") {
        handleRouteChange();
      }
    });
  } else {
    handleRouteChange();
  }
}

registerListeners();
