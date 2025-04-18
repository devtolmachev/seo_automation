const SeoAutomationScript = {
  init() {
    if (window.loadedSeoAutomationScript) return;
    window.loadedSeoAutomationScript = true;

    let cssSection = document.createElement("style");
    cssSection.setAttribute("id", "helper");
    const css = `
      .hidden-dom-element {
        display: none
      }
      .visible {
        display: block;
      }
    `;
    // cssSection.appendChild(document.createTextNode(css));
    // document.body.classList.add('hidden-dom-element');
    // document.head.appendChild(cssSection);

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
      // `http://127.0.0.1:6785/test_data`,
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

        this.processSuggestions.bind(this)(json);
      })
      .catch(this.showError);
  },

  processSuggestions(data) {
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
  ) {
    var alreadyReplaced = new Set();
    const updateElement = (element) => {
      this.replaceText(
        element,
        old_data,
        new_data,
        true,
        ignoreCase,
        alreadyReplaced,
        true,
        attributeToUpdate,
      );
      if (new_selector) {
        this.moveElement(element, new_selector);
      }
    };

    if (!selector) {
      selector = "*";
    }
    const element = document.querySelectorAll(selector);
    element.forEach(updateElement);
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
    const elements = document.querySelectorAll(selector);
    elements.forEach(updateElement);
  },

  replaceText(
    node,
    keyword,
    newText,
    isAsian,
    ignoreCase,
    alreadyReplaced,
    forceSet,
    attributeToUpdate,
  ) {
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

      regex = isAsian
        ? new RegExp(
            `(?<=[\\p{IsHan}\\p{IsBopo}\\p{IsHira}\\p{IsKatakana}]?)${escapedPlainTextPhrase}[\\.{!\\?}(|\\]\\\\]?(?![a-zA-Z])(?=[\\)\\/]?)`,
            ignoreCase ? "i" : "",
          )
        : new RegExp(
            `(?<=^|\\s|[([{<"'В«вЂ№вЂћ"'|/]|\\-|:|'|'|')` +
              `${escapedPlainTextPhrase}` +
              `(?=$|\\s|[)\\]}>"'В»вЂє"'|/]|\\-|[.,:;!?]|'|'|')`,
            ignoreCase ? "gi" : "g",
          );
    }

    var currentNode = walker.currentNode;
    while (currentNode) {
      if (currentNode === document.documentElement) {
        currentNode = walker.nextNode();
        continue;
      }

      if (forceSet && !attributeToUpdate) {
        this.replaceTextNodeOnly(
          currentNode,
          keyword,
          newText,
          true,
          ignoreCase,
        );
      }

      if (attributeToUpdate) {
        var value = currentNode.getAttribute(attributeToUpdate);
        if (value == null) {
          this.replaceTextNodeOnly(
            currentNode,
            keyword,
            newText,
            true,
            ignoreCase,
          );
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
            this.replaceTextNodeOnly(
              currentNode,
              keyword,
              newText,
              false,
              ignoreCase,
            );
          }
        }
      }

      currentNode = walker.nextNode();
    }
  },

  replaceTextNodeOnly(element, oldText, newText, forceSet, ignoreCase) {
    const childNodes = Array.from(element.childNodes);

    if (!childNodes || childNodes.length === 0) {
      if (forceSet) {
        element.textContent = newText;
      } else {
        let flags = ignoreCase ? "gi" : "g";
        let pattern = new RegExp(oldText, flags);
        element.textContent = element.textContent.replaceAll(pattern, newText);
      }
    }

    childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent.includes(oldText)) {
          let flags = ignoreCase ? "gi" : "g";
          let pattern = new RegExp(oldText, flags);

          const newTextNode = document.createTextNode(
            node.textContent.replaceAll(pattern, newText),
          );
          element.replaceChild(newTextNode, node);
        }
      }
    });
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
