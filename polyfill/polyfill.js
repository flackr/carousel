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

function isOffsetAncestor(anc, child) {
  while (child) {
    if (child == anc)
      return true;
    child = child.offsetParent;
  }
  return false;
}

function commonOffsetParent(e1, e2) {
  while (!isOffsetAncestor(e1, e2)) {
    e1 = e1.offsetParent;
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
    e1 = e1.offsetParent;
  }
  while (e2 != ancestor) {
    offset.offsetLeft += e2.offsetLeft;
    offset.offsetTop += e2.offsetTop;
    e2 = e2.offsetParent;
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
        this.fragments[index] = box = document.createElement('fragment');
      }
      box.className = 'fragment';
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
      replaceAll('::fragment', '>fragment').
      replace(/::grid-flow\(([^)]*)\)/g, '>.grid-flow-\$1').
      replace(/[^ >+,]*::scroll-(left|right|up|down)-button/g, forPseudo?'.scroll-\$1-button::before':'.scroll-\$1-button').
      // TODO: Track where the corresponding scroll-markers are flowed into,
      // and target that particular subtree.
      replace(/.*[^ >+,]*::scroll-marker$/g, forPseudo?'scroll-markers>.scroll-marker::before':'scroll-markers>.scroll-marker').
      replace(/.*[^ >+,]*::scroll-marker:checked$/g, forPseudo?'scroll-markers>.scroll-marker:checked::before':'scroll-markers>.scroll-marker:checked').
      replace(/.*[^ >+,]*::scroll-markers$/g, 'scroll-markers');
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
let flowSelectors = new Set();

function handleScroll() {
  const markers = this.scrollMarkerArea?.children;
  if (!markers || markers.length == 0)
    return;
  for (const marker of markers) {
    const element = marker.originatingElement;
    let position = relativeOffset(this, element);
    position.offsetLeft -= this.scrollLeft;
    position.offsetTop -= this.scrollTop;
    // TODO: Consider snap-align, scroll-margin and scroll-padding.
    let intersection = [
      Math.max(0, position.offsetLeft), Math.max(0, position.offsetTop),
      Math.min(position.offsetLeft + element.offsetWidth, this.clientWidth),
      Math.min(position.offsetTop + element.offsetHeight, this.clientHeight)
    ];
    let area = (intersection[2] - intersection[0]) * (intersection[3] - intersection[1]);
    if (area > 0 && area >= element.offsetWidth * element.offsetHeight * 0.5) {
      marker.checked = true;
      break;
    }
  }
}

function resetHandleScroll() {
  this.onscroll = handleScroll;
}

function addMarker(elem) {
  if (elem.markerElement) {
    return;
  }
  const scroller = eventTarget(ancestorScroller(elem));
  if (!scroller.scrollMarkerArea)
    return;
  let marker = document.createElement('input');
  elem.pseudoElements = elem.pseudoElements || [];
  elem.pseudoElements.push(marker);
  elem.markerElement = marker;
  marker.originatingElement = elem;
  marker.className = 'scroll-marker';
  marker.setAttribute('type', 'radio');
  // TODO: Name radio buttons something unique per scrollable area.
  marker.setAttribute('name', 'scroll-marker');
  marker.addEventListener('input', () => {
    const scroller = eventTarget(ancestorScroller(elem));
    let target = relativeOffset(scroller, elem);
    target.offsetLeft = Math.max(0, Math.min(scroller.scrollWidth - scroller.clientWidth, target.offsetLeft));
    target.offsetTop = Math.max(0, Math.min(scroller.scrollHeight - scroller.clientHeight, target.offsetTop));
    if (target.offsetLeft != scroller.scrollLeft || target.offsetTop != scroller.scrollTop) {
      scroller.onscroll = undefined;
      scroller.scrollTo({
        top: target.offsetTop,
        left: target.offsetLeft,
        behavior: 'smooth'
      });
    }
  });
  scroller.scrollMarkerArea.appendChild(marker);
  // TODO: Sort markers by DOM order.
  scroller.onscroll = handleScroll;
  scroller.onscrollend = resetHandleScroll;
  handleScroll.apply(scroller);
}

function update() {
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
}
scroll-markers {
  contain: size;
  display: block;
}
.fragment {
  position: absolute;
  box-sizing: border-box;
}\n`;
  let markerAreaSelectors = new Set();
  let fragmentSelectors = new Set();
  let flowContainers = {};
  let remap = {};
  let buttonContainers = {};
  for (let block of blocks) {
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
    let markers = /^(.*)::scroll-markers$/.exec(block.selector);
    if (markers) {
      const selector = updateSelectors(markers[1]);
      markerAreaSelectors.add(selector);
    }
    let marker = /^(.*)::scroll-marker$/.exec(block.selector);
    if (marker) {
      const selector = updateSelectors(marker[1]);
      markerSelectors.add(selector);
      extraCSS += `${selector} {\n  --scroll-marker: yes;\n}\n`;
      if (!registerPropertySupported) {
        extraCSS += `:where(${selector}>*) {\n  --scroll-marker: none;\n}\n`;
      }
    }
    let fragment = /^(.*)::fragment/.exec(block.selector);
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
    elem.scrollMarkerArea = document.createElement('scroll-markers');
    elem.parentElement.insertBefore(elem.scrollMarkerArea, elem.nextElementSibling);
  }

  const SCROLL_AMOUNTS = {
    right: {left: 40},
    left: {left: -40},
    up: {top: -40},
    down: {top: 40}
  };
  // TODO: Create in consistent order.
  for (let direction in buttonContainers) {
    for (let scroller of getElems(buttonContainers[direction])) {
      let button = document.createElement('button');
      button.className = `scroll-${direction}-button`;
      let nextSibling = scroller;
      if (['down', 'right'].indexOf(direction) != -1) {
        nextSibling = nextSibling.nextElementSibling;
      }
      scroller.parentElement.insertBefore(button, nextSibling);
      button.addEventListener('click', (evt) => {
        scroller.scrollBy({...SCROLL_AMOUNTS[direction], behavior: 'smooth'});
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
  
  // Process elements with scroll-markers
  let markers = [];
  for (let elem of getElems(markerSelectors)) {
    addMarker(elem);
  }

  // Process fragmented elements.
  for (let elem of getElems(fragmentSelectors)) {
    new FragmentNode(elem);
  }
}

Element.prototype.originalInsertBefore = Element.prototype.insertBefore;
Element.prototype.originalRemoveChild = Element.prototype.removeChild;
Element.prototype.insertBefore = function(node, child) {
  this.originalInsertBefore(node, child);
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
    addMarker(node);
  }
}
Element.prototype.appendChild = function(node) {
  this.insertBefore(node, null);
}
Element.prototype.removeChild = function(node) {
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
