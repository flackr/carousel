const registerPropertySupported = !!(window.CSS && CSS.registerProperty);
if (registerPropertySupported) {
  CSS.registerProperty({
    name: '--grid-flow',
    syntax: 'none | <custom-ident>',
    inherits: false,
    initialValue: 'none'
  });
  CSS.registerProperty({
    name: '--scroll-marker',
    syntax: 'none | yes',
    inherits: false,
    initialValue: 'none'
  });
  CSS.registerProperty({
    name: '--scroll-marker-group',
    syntax: 'none | before | after',
    inherits: false,
    initialValue: 'none'
  });
  CSS.registerProperty({
    name: '--overflow-interactivity',
    syntax: 'auto | inert',
    inherits: false,
    initialValue: 'auto'
  });
}

// Parses CSS text into flattened selectors and property values
function parseCSS(str) {
  let result = [];
  let stack = [];
  let env = {selector: '', media: '', props: {}};

  function isspace(str) {
    return /\s/.exec(str);
  }
  function skipSpace(str, i) {
    while (i < str.length) {
      if (isspace(str[i])) {
        ++i;
        continue;
      }
      // Skip comments.
      if (str.substr(i, 2) == '/*') {
        i = str.indexOf('*/', i + 2);
        if (i == -1)
          i = str.length;
        else
          i += 2;
        continue;
      }
      break;
    }
    return i;
  }
  const blocks = {
    '{': '}',
    '"': '"',
    "'": "'"
  };
  function skipBlock(str, i) {
    const start = str[i];
    ++i;
    if (!blocks[start]) {
      return i;
    }
    while (i < str.length) {
      if (str[i] == '\\') {
        i += 2;
        continue;
      }
      if (str.substr(i, 2) == '/*') {
        i = str.indexOf('*/', i + 2);
        if (i == -1)
          i = str.length;
        else
          i += 2;
      }
      if (str[i] == blocks[start]) {
        ++i
        break;
      }
      if (blocks[str[i]]) {
        i = skipBlock(str, i);
        continue;
      }
      ++i;
    }
    return i;
  }
  function parseWord(str, i) {
    const start = i;
    while (i < str.length && /\w/.exec(str[i])) {
      ++i;
    }
    return {word: str.substring(start, i), next: i};
  }
  function skipUntil(str, i, re) {
    while (i < str.length && !re.exec(str[i])) {
      i = skipBlock(str, i);
    }
    return i;
  }
  let i = skipSpace(str, 0);
  while (i < str.length) {

    if (str[i] == '@') {
      let {word, next} = parseWord(str, ++i);
      i = next;
      switch(word) {
        case 'keyframes': {
          i = skipUntil(str, i, /[{]/);
          i = skipBlock(str, i);
          break;
        }
        case 'import': {
          // TODO: Read imported sheets
          i = skipUntil(str, i, /;/);
          i = skipBlock(str, i);
          break;
        }
        case 'media': {
          // TODO: Enter nested environment with media query.
          break;
        }
        default: {
          console.warn('Unrecognized @ query');
          i = skipUntil(str, i, /[{;]/);
          i = skipBlock(str, i);
          break;
        }
      }
    } else if (str[i] == '}') {
      result.push(env);
      env = stack.pop();
      ++i;
    } else {
      const start = i;
      i = skipUntil(str, i, /[{;}]/);
      if (str[i] == '{') {
        stack.push({...env});
        env.props = {};
        let selector = str.substring(start, i).trim();
        if (env.selector) {
          if (selector.indexOf('&') != -1) {
            selector = selector.replaceAll('&', env.selector);
          } else {
            // If not explicitly specifed, select a descendant of previous selector.
            selector = [env.selector, selector].join(' ');
          }
        }
        env.selector = selector;
        ++i;
      } else {
        // ; or } means end of property.
        if (stack.length == 0) {
          console.warn(`Bare property at ${i}`);
        }
        let splitter = str.indexOf(':', start);
        if (splitter == -1) {
          console.warn(`Missing : at ${i}: ${str.substring(start, i)}`);
        } else {
          env.props[str.substring(start, splitter).trim()] = str.substring(splitter + 1, i).trim();
        }
        if (str[i] == ';') {
          ++i;
        }
      }
      
    }
    i = skipSpace(str, i);
  }
  return result;
}

function isAncestor(anc, child) {
  while (child && child != anc) {
    child = child.parentElement;
  }
  return child == anc;
}

function findAncestor(child, fn) {
  while (child && !fn(child)) {
    child = child.parentElement;
  }
  return child;
}

function ancestorFocusGroup(child) {
  return findAncestor(child.parentElement, (elem) => {
    return elem.hasAttribute('focusgroup');
  });
}

function isOffsetAncestor(anc, child) {
  while (child) {
    if (child == anc)
      return true;
    child = child.offsetParent || window;
  }
  return false;
}

function commonOffsetParent(e1, e2) {
  while (!isOffsetAncestor(e1, e2)) {
    e1 = e1.offsetParent || window;
  }
  return e1;
}

function relativeOffset(e1, e2) {
  let ancestor = commonOffsetParent(e1, e2);
  let offset = {
    offsetTop: 0,
    offsetLeft: 0,
  };
  while (e1 != ancestor) {
    offset.offsetLeft -= e1.offsetLeft;
    offset.offsetTop -= e1.offsetTop;
    e1 = e1.offsetParent || window;
  }
  while (e2 != ancestor) {
    offset.offsetLeft += e2.offsetLeft;
    offset.offsetTop += e2.offsetTop;
    e2 = e2.offsetParent || window;
  }
  return offset;
}

function absolutePositionContainer(ancestor) {
  while (ancestor && ancestor.parentElement) {
    if (getComputedStyle(ancestor).position != 'static')
      break;
    ancestor = ancestor.parentElement;
  }
  return ancestor;
}

function columnWidth(elem) {
  // Compute the used column width of the given element.
  const cs = getComputedStyle(elem);
  let columns = cs.columnCount == 'auto' ? 0 : parseInt(cs.columnCount);
  if (columns == 0 && cs.columnWidth != 'auto') {
    columns = Math.floor(elem.clientWidth / parseFloat(cs.columnWidth));
  }
  // Assume 1 column if not known.
  if (columns == 0) {
    columns = 1;
  }
  return elem.clientWidth / columns;
}

class FragmentNode {
  constructor(node) {
    this.container = document.createElement('fragments-container');
    this.node = node;
    this.fragments = {};
    let child = null;
    while (child = node.firstElementChild) {
      this.container.appendChild(child);
    }
    node.appendChild(this.container);

    const resizeObserver = new ResizeObserver((entries) => {
      this.update();
    });
    resizeObserver.observe(this.container);
    // TODO: The above observation should be sufficient. Why is this required?
    resizeObserver.observe(this.node);
  }

  update() {
    // First compute, the offset of abs pos children for adjusting bounds of constructed DOM.
    const offset = absolutePositionContainer(this.node).getBoundingClientRect();
    const cs = getComputedStyle(this.node);
    const borderTop = parseFloat(cs.borderTop) || 0;
    const borderLeft = parseFloat(cs.borderLeft) || 0;
    const colWidth = columnWidth(this.node);
    let columns = {};
    const rects = this.container.getClientRects();
    for (let rect of rects) {
      if (rect.width == 0 || rect.height == 0)
        continue;
      const absrect = {
        top: rect.y - offset.y + this.node.scrollTop - borderTop,
        left: rect.x - offset.x + this.node.scrollLeft - borderLeft,
        bottom: rect.bottom - offset.y + this.node.scrollTop - borderTop,
        right: rect.right - offset.x + this.node.scrollLeft - borderLeft,
      };
      let index = Math.max(0, Math.floor(absrect.left / colWidth));
      if (columns[index]) {
        columns[index].left = Math.min(columns[index].left, absrect.left);
        columns[index].top = Math.min(columns[index].top, absrect.top);
        columns[index].right = Math.max(columns[index].right, absrect.right);
        columns[index].bottom = Math.max(columns[index].bottom, absrect.bottom);
      } else {
        columns[index] = absrect;
      }
    }
    // Remove previous boxes which no longer exist.
    for (let index in this.fragments) {
      if (!columns[index]) {
        this.fragments[index].remove();
        delete this.fragments[index];
      }
    }
    // Create / update boxes.
    for (let index in columns) {
      let rect = columns[index];
      let box = null;
      let created = false;
      if (this.fragments[index]) {
        box = this.fragments[index];
      } else {
        created = true;
        this.fragments[index] = box = document.createElement('column');
      }
      box.className = 'column';
      let childIdx = 0;
      for (; childIdx < this.container.children.length - 1 && (this.container.children[childIdx].offsetLeft < rect.left || this.container.children[childIdx].offsetLeft > rect.right); ++childIdx);
      box.firstFragmentChild = this.container.children[childIdx];
      box.style.top = `${rect.top}px`;
      box.style.left = `${rect.left}px`;
      box.style.width = `${rect.right - rect.left}px`;
      box.style.height = `${rect.bottom - rect.top}px`;
      if (created) {
        this.node.insertBefore(box, this.container);
      }
    }
  }
}

function updateSelectors(selector, forPseudo) {
  return selector.
      replaceAll('::column', '>column').
      replace(/::grid-flow\(([^)]*)\)/g, '>.grid-flow-\$1').
      replace(/[^ >+,]*::scroll-(left|right|up|down)-button/g, forPseudo?'.scroll-\$1-button::before':'.scroll-\$1-button').
      // TODO: Track where the corresponding scroll-marker-group are flowed into,
      // and target that particular subtree.
      replace(/.*[^ >+,]*::scroll-marker$/g, forPseudo?'scroll-marker-group>.scroll-marker::before':'scroll-marker-group>.scroll-marker').
      replace(/.*[^ >+,]*::scroll-marker:checked$/g, forPseudo?'scroll-marker-group>.scroll-marker:checked::before':'scroll-marker-group>.scroll-marker:checked').
      replace(/.*[^ >+,]*::scroll-marker:focus$/g, forPseudo?'scroll-marker-group>.scroll-marker:focus::before':'scroll-marker-group>.scroll-marker:focus').
      replace(/:checked/g, ':is(.checked,:checked)').
      replace(/.*[^ >+,]*::scroll-marker-group$/g, 'scroll-marker-group');
}

function getElems(selectors) {
  let elems = new Set();
  for (let selector of selectors) {
    for (let elem of document.querySelectorAll(selector)) {
      elems.add(elem);
    }
  }
  return elems;
}

function ancestorScroller(elem) {
  const SCROLLER_OVERFLOW = ['scroll', 'auto'];
  while (elem.parentElement) {
    // TODO: This should follow the containing block chain.
    elem = elem.parentElement;
    if (elem && SCROLLER_OVERFLOW.indexOf(getComputedStyle(elem).overflowX) != -1) {
      return elem;
    }
  }
  return document.scrollingElement;
}

function eventTarget(scroller) {
  if (scroller === document.scrollingElement) {
    return window;
  }
  return scroller;
}

let markerSelectors = new Set();
let markerVars = new Set();
let flowSelectors = new Set();
let skipGroups = new Set();

function handleScroll() {
  const scrollerElement = this == window ? document.documentElement : this;
  const markers = scrollerElement.scrollMarkers;
  const groups = new Map();
  for (let marker of markers) {
    const focusGroup = ancestorFocusGroup(marker) || 'default';
    if (skipGroups.has(focusGroup))
      continue;
    const group = groups.get(focusGroup) || new Set();
    group.add(marker);
    groups.set(focusGroup, group);
  }

  if (!markers || markers.length == 0)
    return;
  const ALIGN_PORTION = {
    'start': 0,
    'center': 0.5,
    'end': 1
  };
  const SLOP = 1;
  for (let [_, markerSet] of groups) {
    let selected = null;
    for (const marker of markerSet) {
      if (selected === null)
        selected = marker;
      const element = marker.scrollTargetElement;
      if (!element) continue;
      let position = relativeOffset(this, element);

      // Determine target scroll position taking into account snapping:
      // TODO: Consider scroll-margin and scroll-padding.
      const snapAlign = getComputedStyle(element).scrollSnapAlign.split(' ');
      if (snapAlign.length == 1)
        snapAlign.push(snapAlign[0]);
      if (snapAlign[0] != 'none') {
        position.offsetTop -= ALIGN_PORTION[snapAlign[0]] * Math.max(0, scrollerElement.clientHeight - element.clientHeight);
      }
      if (snapAlign[1] != 'none') {
        position.offsetLeft -= ALIGN_PORTION[snapAlign[1]] * Math.max(0, scrollerElement.clientWidth - element.clientWidth);
      }

      // Limit offsetTop and offsetLeft by how far we could scroll
      position.offsetLeft = Math.min(position.offsetLeft, scrollerElement.scrollWidth - scrollerElement.clientWidth);
      position.offsetTop = Math.min(position.offsetTop, scrollerElement.scrollHeight - scrollerElement.clientHeight);
      position.offsetLeft -= scrollerElement.scrollLeft;
      position.offsetTop -= scrollerElement.scrollTop;
      if (position.offsetLeft > SLOP || position.offsetTop > SLOP) {
        continue;
      }
      selected = marker;
    }
    if (selected !== null) {
      setActiveMarker(selected);
    }
    const markerScroller = ancestorScroller(selected);
    if (markerScroller != document.scrollingElement && markerScroller != scrollerElement) {
      // TODO: This should not scroll ancestor scrollers.
      selected.scrollIntoView({block: 'nearest', inline: 'nearest', behavior: 'auto'});
    }
  }
}

function addPseudoMarker(elem, usedProps) {
  if (elem.markerElement) {
    return;
  }
  const scroller = eventTarget(ancestorScroller(elem));
  if (!scroller.scrollMarkerArea)
    return;
  let marker = document.createElement('a');
  marker.setAttribute('tabindex', -1);
  elem.pseudoElements = elem.pseudoElements || [];
  elem.pseudoElements.push(marker);
  elem.markerElement = marker;
  marker.originatingElement = elem;
  marker.scrollTargetElement = elem;

  // Copy attributes from originating element so attr functions work.
  const EXCLUDED = ['name', 'type', 'class', 'style'];
  for (let name of elem.getAttributeNames()) {
    if (EXCLUDED.indexOf(name) != -1)
      continue;
    marker.setAttribute(name, elem.getAttribute(name));
  }
  // Copy used custom properties from originating element.
  const cs = getComputedStyle(elem);
  for (let name of markerVars) {
    marker.style.setProperty(name, cs.getPropertyValue(name));
  }

  marker.className = 'scroll-marker';
  scroller.scrollMarkerArea.appendChild(marker);
}

function update() {
  // Cleans up the global state associated with the previous update and injected stylesheets.
  // Note that the DOM changes are not cleaned up so this will only work if you have replaced all of the modified DOM.
  markerSelectors = new Set();
  markerVars = new Set();
  flowSelectors = new Set();
  skipGroups = new Set();
  let removeStyles = document.querySelectorAll('style[polyfill-generated]');
  for (let sheet of removeStyles) {
    sheet.remove();
  }

  let generated = document.createElement('style');
  generated.setAttribute('polyfill-generated', 'true');
  let stylesheets = document.querySelectorAll('style:not([polyfill-generated])');
  let blocks = [];
  for (let sheet of stylesheets) {
    blocks = blocks.concat(parseCSS(sheet.innerHTML));
  }
  let extraCSS = `
.scroll-marker {
  appearance: none;
  display: block;
  /* button resets */
  border: 0;
  padding: 0;
  background: none;
}
scroll-marker-group {
  contain: size;
  display: block;
}
.column {
  position: absolute;
  box-sizing: border-box;
  pointer-events: none;
}\n`;
  let markerAreaSelectors = new Set();
  let fragmentSelectors = new Set();
  let interactivitySelectors = new Set();
  let flowContainers = {};
  let remap = {};
  let buttonContainers = {};
  for (let block of blocks) {
    if (block.props['scroll-marker-group']) {
      let mutatedSelector = updateSelectors(block.selector);
      extraCSS += `${mutatedSelector} {\n  --scroll-marker-group: ${block.props['scroll-marker-group']};\n}\n`;
      if (!registerPropertySupported) {
        extraCSS += `:where(${mutatedSelector}>*) {\n  --scroll-marker-group: none;\n}\n`;
      }
      markerAreaSelectors.add(mutatedSelector);
    }
    if (block.props['grid-flow']) {
      let mutatedSelector = updateSelectors(block.selector);
      extraCSS += `${mutatedSelector} {\n  --grid-flow: ${block.props['grid-flow']};\n}\n`;
      if (!registerPropertySupported) {
        extraCSS += `:where(${mutatedSelector}>*) {\n  --grid-flow: none;\n}\n`;
      }
      flowSelectors.add(mutatedSelector);

      // Mutate any styles targeting this selector to the destination in which content will be placed.
      let result = /^([^:]*)(::grid-flow\([^)]*\))(::.*)$/.exec(block.selector);
      if (result) {
        let destinationSelector = `${result[1]}::grid-flow(${block.props['grid-flow']})${result[3]}`;
        remap[block.selector] = destinationSelector;
      }
    }
    if (block.props['overflow-interactivity']) {
      let mutatedSelector = updateSelectors(block.selector);
      extraCSS += `${mutatedSelector} {\n  --overflow-interactivity: ${block.props['overflow-interactivity']};\n}\n`;
      if (!registerPropertySupported) {
        extraCSS += `:where(${mutatedSelector}>*) {\n  --overflow-interactivity: auto;\n}\n`;
      }
      interactivitySelectors.add(mutatedSelector);
    }
  }

  for (let block of blocks) {
    let selector = block.selector;
    for (let prefix in remap) {
      if (selector.startsWith(prefix)) {
        selector = remap[prefix] + selector.slice(prefix.length);
      }
    }
    let button = /^(.*)::scroll-(up|down|left|right)-button$/.exec(block.selector);
    if (button) {
      const selector = updateSelectors(button[1]);
      const direction = button[2];
      buttonContainers[direction] = buttonContainers[direction] || new Set();
      buttonContainers[direction].add(selector);
    }
    let flow = /^(.*)::grid-flow\(([^)]*)\)$/.exec(block.selector);
    if (flow) {
      // Selector on which grid flow was added.
      const selector = updateSelectors(flow[1]);
      const name = flow[2];
      flowContainers[selector] = flowContainers[selector] || new Set();
      flowContainers[selector].add(name);
    }
    let marker = /^(.*)::scroll-marker$/.exec(block.selector);
    if (marker) {
      const selector = updateSelectors(marker[1]);
      markerSelectors.add(selector);
      // Find properties used in markers. These must be copied to the marker.
      for (let prop in block.props) {
        for (let match of [...block.props[prop].matchAll(/var\(--[a-zA-Z-]+\)/g)]) {
          const varName = match[0].substring(4, match[0].length - 1);
          markerVars.add(varName);
        }
      }
      extraCSS += `${selector} {\n  --scroll-marker: yes;\n}\n`;
      if (!registerPropertySupported) {
        extraCSS += `:where(${selector}>*) {\n  --scroll-marker: none;\n}\n`;
      }
    }
    let fragment = /^(.*)::column/.exec(block.selector);
    if (fragment) {
      // Selector on which grid fragment was added.
      const selector = updateSelectors(fragment[1]);
      fragmentSelectors.add(selector);
    }

    let mutatedSelector = updateSelectors(selector);
    if (mutatedSelector != block.selector) {
      let props = '';
      let pseudoProps = '';
      for (let prop in block.props) {
        if (prop == 'content') {
          pseudoProps += `  ${prop}: ${block.props[prop]};\n`;
        } else {
          props += `  ${prop}: ${block.props[prop]};\n`
        }
      };
      if (props)
        extraCSS += `${mutatedSelector} {\n${props}}\n`;
      if (pseudoProps)
        extraCSS += `${updateSelectors(selector, true)} {\n${pseudoProps}}\n`;
    }
  }
  generated.innerHTML = extraCSS;
  document.head.appendChild(generated);
  for (let selector in flowContainers) {
    for (let elem of document.querySelectorAll(selector)) {
      elem.gridFlows = {};
      for (let area of flowContainers[selector]) {
        let div = document.createElement('div');
        div.originatingElement = elem;
        div.className = `grid-flow-${area}`;
        elem.appendChild(div);
        elem.gridFlows[area] = div;
      }
    }
  }
  for (let elem of getElems(markerAreaSelectors)) {
    if (elem.scrollMarkerArea)
      continue;
    let pos = getComputedStyle(elem).getPropertyValue('--scroll-marker-group');
    if (pos == 'none')
      return;
    elem.scrollMarkerArea = document.createElement('scroll-marker-group');
    elem.scrollMarkerArea.setAttribute('focusgroup', '');
    let beforeElem = elem;
    if (pos != 'before')
      beforeElem = elem.nextElementSibling;

    elem.parentElement.insertBefore(elem.scrollMarkerArea, beforeElem);
  }

  for (let direction of ['up', 'left', 'right', 'down']) {
    if (!buttonContainers[direction])
      continue;
    for (let scroller of getElems(buttonContainers[direction])) {
      let button = document.createElement('button');
      button.className = `scroll-${direction}-button`;
      let nextSibling = scroller;
      scroller.parentElement.insertBefore(button, nextSibling);
      button.addEventListener('click', (evt) => {
        let scrollAmount = {};
        if (direction == 'up' || direction == 'down') {
          scrollAmount.top = scroller.clientHeight * 0.85;
          if (direction == 'up') scrollAmount.top *= -1;
        } else if (direction == 'left' || direction == 'right') {
          scrollAmount.left = scroller.clientWidth * 0.85;
          if (direction == 'left') scrollAmount.left *= -1;
        }
        scroller.scrollBy({...scrollAmount, behavior: 'smooth'});
        evt.preventDefault();
      });
      let updateDisabled = () => {
        const disabled =
            direction == 'up' && scroller.scrollTop <= 0 ||
            direction == 'left' && scroller.scrollLeft <= 0 ||
            direction == 'down' && scroller.scrollTop >= scroller.scrollHeight - scroller.clientHeight ||
            direction == 'right' && scroller.scrollLeft >= scroller.scrollWidth - scroller.clientWidth;
        if (disabled) {
          button.setAttribute('disabled', true);
        } else {
          button.removeAttribute('disabled');
        }
      };
      scroller.addEventListener('scroll', updateDisabled);
      const resizeObserver = new ResizeObserver((entries) => {
        updateDisabled();
      });
      resizeObserver.observe(scroller);
      updateDisabled();
    }
  }

  // Process elements with grid-flow
  for (let elem of getElems(flowSelectors)) {
    const gridflow = getComputedStyle(elem).getPropertyValue('--grid-flow');
    const flows = elem.parentElement.gridFlows || {};
    const flow = flows[gridflow];
    if (flow) {
      flow.appendChild(elem);
    }
  }
  
  // Process elements with scroll-marker-group
  let markers = [];
  for (let elem of getElems(markerSelectors)) {
    addPseudoMarker(elem);
  }
  for (let elem of document.querySelectorAll('a[href^="#"]')) {
    let target = document.getElementById(elem.getAttribute('href').substring(1));
    elem.scrollTargetElement = target;
  }

  // Process fragmented elements.
  for (let elem of getElems(fragmentSelectors)) {
    new FragmentNode(elem);
  }

  for (let elem of getElems(interactivitySelectors)) {
    let updateInteractivity = () => {
      let containerRect = elem.getBoundingClientRect();
      const container = elem.querySelector(':scope > fragments-container') || elem;
      for (let child of container.children) {
        let childRect = child.getBoundingClientRect();
        const inView =  childRect.right > containerRect.left && childRect.left < containerRect.right && childRect.bottom > containerRect.top && childRect.top < containerRect.bottom;
        if (inView)
          child.removeAttribute('inert');
        else
          child.setAttribute('inert', '');
      }
    };
    requestAnimationFrame(updateInteractivity);
    elem.addEventListener('scroll', updateInteractivity);
    const resizeObserver = new ResizeObserver((entries) => {
      updateInteractivity();
    });
    resizeObserver.observe(elem);
  }
}

const SCROLL_MARKER_HANDLERS = {
  'blur': function(evt) {
    this.didActivate = false;
  },
  'click': function(evt) {
    setActiveMarker(this, true);
    if (!ancestorFocusGroup(this))
      return;
    this.didActivate = true;
    evt.preventDefault();
  },
  'keydown': function(evt) {
    if (!ancestorFocusGroup(this))
      return;
    const DIRS = {
      'ArrowUp': -1,
      'ArrowLeft': -1,
      'ArrowDown': 1,
      'ArrowRight': 1,
    };
    if (evt.code == 'Tab') {
      if (this.didActivate) {
        // Move focus to the scroll target when tabbing away to tab from the location just scrolled to.
        const elem = this.scrollTargetElement;
        this.blur();
        let focusFrom = elem.firstFragmentChild ?? elem;
        if (focusFrom.hasAttribute('tabindex')) {
          focusFrom.focus();
          evt.preventDefault();
        } else {
          focusFrom.scrollIntoView();
          // Let the browser's tab navigation tab from here.
        }
      }
      return;
    }
    const dir = DIRS[evt.code];
    if (!dir)
      return;
    this.didActivate = false;
    const elem = this.scrollTargetElement;
    const scrollerElement = ancestorScroller(elem);
    const markers = scrollerElement.scrollMarkers;
    let index = markers.indexOf(this);
    if (index == -1)
      return;
    evt.preventDefault();
    index = (markers.length + index + dir) % markers.length;
    markers[index].focus();
    markers[index].didActivate = true;
    setActiveMarker(markers[index], true);
  }
};

function addScrollMarker(marker) {
  const elem = marker.scrollTargetElement;
  if (!elem || !elem.isConnected)
    return;
  const scrollerElement = ancestorScroller(elem)
  const scroller = eventTarget(scrollerElement);
  if (scrollerElement.scrollMarkers && scrollerElement.scrollMarkers.indexOf(marker) != -1) {
    return;
  }

  for (let eventType in SCROLL_MARKER_HANDLERS) {
    marker.addEventListener(eventType, SCROLL_MARKER_HANDLERS[eventType]);
  }
  // TODO: Sort markers by DOM order.
  scrollerElement.scrollMarkers = scrollerElement.scrollMarkers || [];
  scrollerElement.scrollMarkers.push(marker);
  scrollerElement.scrollMarkers = scrollerElement.scrollMarkers.sort((a, b) => {
    // https://developer.mozilla.org/en-US/docs/Web/API/Node/compareDocumentPosition
    return a.compareDocumentPosition(b) == 2; // DOCUMENT_POSITION_PRECEDING
  });
  scroller.onscroll = handleScroll;
  handleScroll.apply(scroller);
}

function removeScrollMarker(marker) {
  const elem = marker.scrollTargetElement;
  const scrollerElement = ancestorScroller(elem)
  const scroller = eventTarget(scrollerElement);
  if (!elem || !elem.isConnected)
    return;
  for (let eventType in SCROLL_MARKER_HANDLERS) {
    marker.removeEventListener(eventType, SCROLL_MARKER_HANDLERS[eventType]);
  }
  scrollerElement.scrollMarkers.splice(scrollerElement.scrollMarkers.indexOf(marker), 1);
}

function setActiveMarker(marker, scrollTo) {
  const elem = marker.scrollTargetElement;
  if (!elem)
    return;
  const scrollerElement = ancestorScroller(elem);
  const scroller = eventTarget(scrollerElement);
  const markers = scrollerElement.scrollMarkers;
  if (scrollTo) {
    let target = relativeOffset(scroller, elem);
    const scrollerElement = scroller == window ? document.documentElement : scroller;
    target.offsetLeft = Math.max(0, Math.min(scrollerElement.scrollWidth - scrollerElement.clientWidth, target.offsetLeft));
    target.offsetTop = Math.max(0, Math.min(scrollerElement.scrollHeight - scrollerElement.clientHeight, target.offsetTop));
    if (target.offsetLeft != scrollerElement.scrollLeft || target.offsetTop != scrollerElement.scrollTop) {
      const group = ancestorFocusGroup(marker);
      if (group) {
        skipGroups.add(group);
        scroller.addEventListener('scrollend', () => {
          skipGroups.delete(group);
        }, {once: true});
      }
      scroller.scrollTo({
        top: target.offsetTop,
        left: target.offsetLeft,
        behavior: getComputedStyle(scroller).scrollBehavior
      });
    }
  }
  const focusGroup = ancestorFocusGroup(marker);
  for (const m of markers) {
    const markerGroup = ancestorFocusGroup(m);
    if (m == marker || markerGroup !== focusGroup) continue;
    m.checked = false;
    m.classList.remove('checked');
    m.setAttribute('aria-selected', false);
    if (focusGroup && isAncestor(focusGroup, marker) && m.originalTabIndex) {
      m.setAttribute('tabindex', m.originalTabIndex);
    }
  }
  marker.checked = true;
  marker.classList.add('checked');
  marker.setAttribute('aria-selected', true);
  const originalTabIndex = marker.getAttribute('tabindex');
  if (focusGroup && originalTabIndex == -1) {
    marker.originalTabIndex = -1;
    marker.setAttribute('tabindex', 0);
  }
}

Object.defineProperty(Element.prototype, 'scrollTargetElement', {
  configurable: true, enumerable: true,
  get: function() { return this.__scrollTargetElement; },
  set: function(y) {
    removeScrollMarker(this);
    this.__scrollTargetElement  = y;
    addScrollMarker(this);
  }
});
Object.defineProperty(Element.prototype, '__scrollTargetElement', {
  configurable: true, writable: true, enumerable: true, value :""
});

Element.prototype.originalInsertBefore = Element.prototype.insertBefore;
Element.prototype.originalRemoveChild = Element.prototype.removeChild;
Element.prototype.insertBefore = function(node, child) {
  this.originalInsertBefore(node, child);

  if (!node || !(node instanceof Element) || !node.isConnected)
    return;

  // Check if this child should be inserted somewhere else
  const cs = getComputedStyle(node);
  let flow = cs.getPropertyValue('--grid-flow');
  if (flow && flow != 'none') {
    let originating = this;
    while (originating.originatingElement) {
      originating = originating.originatingElement;
    }
    let flowElem = originating.gridFlows && originating.gridFlows[flow];
    if (flowElem && !isAncestor(flowElem, node)) {
      // TODO: This should preserve the relative order w.r.t. other content.
      flowElem.appendChild(node);
    }
  }
  let marker = cs.getPropertyValue('--scroll-marker');
  if (marker == 'yes') {
    addPseudoMarker(node);
  }
  addScrollMarker(node);
}
Element.prototype.appendChild = function(node) {
  this.insertBefore(node, null);
}
Element.prototype.removeChild = function(node) {
  removeScrollMarker(node);
  // Remove pseudo elements generated by this element, e.g. the scroll marker for the fragment.
  if (node.pseudoElements) {
    for (let pseudo of node.pseudoElements) {
      pseudo.remove();
    }
    node.pseudoElements = undefined;
  }
  this.originalRemoveChild(node);
}
Element.prototype.remove = function() {
  if (this.parentElement) {
    this.parentElement.removeChild(this);
  }
}
document.addEventListener('DOMContentLoaded', update);
