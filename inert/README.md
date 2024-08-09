# CSS Inertness

## Problem

It is expected that for paginated carousel content,
only content on the active page is focusable /
included in the tab order.
This is typically accomplished through the use of Javascript,
as can be seen in the [Web Accessibility Initiative Carousel example](https://www.w3.org/WAI/tutorials/carousels/working-example/).

However, this should be simple to express and accomplish in CSS.
This is being discussed in [#10711](https://github.com/w3c/csswg-drafts/issues/10711).

## Proposal

As been proposed previously in issue [#7201](https://github.com/w3c/csswg-drafts/issues/7021),
a new property would allow controlling inertness via CSS.
This could take on one of a few forms:

### Control element's own inertness

Similar to display: none, a property would be added that removes the element and its subtree from the accessibility tree.
The proposed syntax would be:

```css
interactivity: auto | inert;
```

UA's could additionally include the following rule
explaining how this combines with the [HTML inert attribute](https://html.spec.whatwg.org/#the-inert-attribute):

```css
*[inert] {
  interactivity: inert;
}
```

This property would then need to be combined with some selector which is aware of whether the item is on the current screen.
This could use:
* A view timeline,
* The ::snapped pseudoclass to find the snapped element,
* The :checked scroll marker

### Controlling overflow inertness

A property is added to the element with scrollable overflow,
declaring that overflowing content is to be made inert.

```css
overflow-interactivity: auto | inert;
```

This would define that content which is in the overflow should be made inert.
Developers would set this when they have an alternate mechanism by which users can access the content.
