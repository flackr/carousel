# Scroll-marker elements and pseudo-elements

## Problem

Authors need to be able to easily create a set of focusable markers for all of their items,
or pages of items when combined with automatic fragmentation.

For individual items, an author *can* do this manually,
though it requires writing extra elements
which need to be kept up to date with the items to which they scroll.
Script also needs to be used to get the desired scrolling behavior.

For dynamically content-sized pages, this can only currently be done with script which generates DOM.
By having a way to automatically generate markers,
many more advanced UI patterns can be solved in CSS.

### Requirements

Scroll markers require the combination of several behaviors:

1. They should scroll to the target on activation,
2. only one of the scroll markers in a group should be active (and focusable) at a time (see [roving tab-index](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Keyboard-navigable_JavaScript_widgets#technique_1_roving_tabindex)),
3. arrow keys should cycle between the other markers,
4. the correct one is automatically activated as a result of scrolling, and
5. The active marker should be stylable.

## Proposals

The following proposes how scroll markers can be achieved via elements and via pseudo-elements.

### Elements

Existing links using the `href` attribute are automatically considered to be scroll markers.
When these links are within a `focusgroup`, the one in the focusgroup closest to being scrolled to is considered active.
The active one will be [remembered as last focused](https://open-ui.org/components/focusgroup.explainer/#last-focused-memory).

E.g.

```html
<div class=toc focusgroup>
  <a href="section-1">Section 1</a><br>
  <a href="section-2">Section 2</a><br>
  <a href="section-3">Section 3</a><br>
</div>
```

The `href` attribute sets the `scrollTargetElement` of the `a` anchor element to the element with the associated id.

### Pseudo-elements

Using pseudo-elements is the *only* way to declaratively handle dynamic cases
where the number of elements generating markers is not known (e.g. based on [fragmentation](../fragmentation/)).

We create a `::scroll-marker-group` pseudo-element on [scroll containers](https://www.w3.org/TR/css-overflow-3/#scroll-container).
This pseudo-element will implicitly have `contain: size`,
and is either immediately before or after the scroll container depending on the value of the `scroll-marker-group` property.

The `::scroll-marker` pseudo-element will create a focusable marker which when activated will scroll the element into view.
This pseudo-element will be flowed into the `::scroll-marker-group` pseudo-element of its containing scroll container. It behaves as a link with a scrollTargetElement set to the pseudo-element's owning element.

```css
ul {
  overflow: auto;
  scroll-marker-group: after;
}
ul::scroll-marker-group {
  display: flex;
  width: 100%;
  /* Reserve space for scroll markers */
  height: 40px;
  /* Allow scrolling if too many scroll markers are inserted. */
  overflow: auto;
}
li::scroll-marker {
  content: "#";
}
```

### scrollTargetElement

Scroll markers (anchor links and `::scroll-marker` pseudos) with a containing focusgroup implement the [tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/), in particular:
* The currently active scroll marker within each group will have a persistent :checked psuedo-class applied to it.
* The active marker will be [remembered as last focused](https://open-ui.org/components/focusgroup.explainer/#last-focused-memory) following the [roving tabindex](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#kbd_roving_tabindex) behavior.

In addition,
1.  these markers automatically respond to other scrolling operations.
    When any scrolling operation takes place,
    the first marker which is considered to be scrolled into view becomes active, but is not focused.

2.  Activation of a marker (e.g. clicking, pressing space / enter) scrolls to the `scrollTargetElement`.
    However, if the marker is part of a focusgroup, focus is not moved to the target until tabbing away.
    This allows subsequent tab navigation within the targeted component,
    consistent with following an anchor link navigation,
    and their common use for [skip links](https://www.w3.org/TR/2016/NOTE-WCAG20-TECHS-20161007/G1).

### The active marker

A scroll marker is determined to be active per scroller per marker group as follows:
* The one which scrolling to would not require scrolling or would scroll backwards to scroll to.
* In a tie, if one is an ancestor of the other, the ancestor is not considered,
* Of the remaining elements whose scroll distance to scroll into view is the same,
  the first in tree order is selected.

When asked to [run the scroll steps](https://drafts.csswg.org/cssom-view/#document-run-the-scroll-steps)
the active marker should be updated according to the eventual scroll location that the scroller will reach
based on the current scrolling operation.

#### Styling the active marker

The active marker is considered to be toggled to an on state and can be styled using the [:checked pseudo-class](https://developer.mozilla.org/en-US/docs/Web/CSS/:checked).

## Example

Scroll markers and the scroll-marker-group area can be used to create navigation points.

Examples build on polyfill:
* [Using pseudo-elements to dynamically construct legend](https://flackr.github.io/carousel/examples/scroll-marker/)
* [Using scrolltarget for table of contents](https://flackr.github.io/carousel/examples/scroll-marker/scrolltarget/)

## Alternatives considered

#### Invoker action and focusgroup invoke action

We could add a new built-in `invoke-action` (see [invokers](https://open-ui.org/components/invokers.explainer/)) `scrollTo`. When invoked, the `invokeTarget` will be scrolled to within its ancestor scrolling container. E.g.

```html
<button invoketarget="my-section" invokeaction="scrollTo">Scroll to section</button>
...
<section id="my-section">
  This will be scrolled into view when you click the button
</section>
```

Invoker actions are only [invoked](https://open-ui.org/components/invokers.explainer/#terms) on explicit activation,
and interest actions are shown [interest](https://open-ui.org/components/interest-invokers.explainer/#terms) on focus *or* hover.
For scroll markers, we want the action to be taken only when the selected target changes, which occurs on focus, but not on hover.
This is very similar to an expressed intent to invoke the target.

As such, we'd propose adding the `invoke` keyword to the `focusgroup` attribute to allow invoking the `invokeaction` on focusgroup focus changes. E.g.

```html
<style>
  #toc {
    position: sticky;
    top: 0;
  }
</style>
<ul class="toc" focusgroup="invoke">
  <li><button tabindex="-1" invoketarget="section-1" invokeaction="scrollTo">Section 1</button></li>
  <li><button tabindex="-1" invoketarget="section-2" invokeaction="scrollTo">Section 2</button></li>
  <li><button tabindex="-1" invoketarget="section-3" invokeaction="scrollTo">Section 3</button></li>
  <li><button tabindex="-1" invoketarget="section-4" invokeaction="scrollTo">Section 4</button></li>
</ul>
<section id="section-1">...</section>
<section id="section-2">...</section>
<section id="section-3">...</section>
<section id="section-4">...</section>
```

Note that this example uses tabindex="-1" to apply the [roving tab index with a guaranteed tab stop](https://open-ui.org/components/focusgroup.explainer/#guaranteed-tab-stop) behavior from focusgroup.

This proposal notably does not meet requirements 4 and 5 of scroll markers.
