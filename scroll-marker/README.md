# Scroll-marker pseudo-elements

## Problem

Authors need to be able to easily create a set of focusable markers for all of their items,
or pages of items when combined with automatic fragmentation.

For individual items, an author *can* do this manually,
though it requires writing extra elements
which need to be kept up to date with the items to which they scroll.

For dynamically content-sized pages, this can only currently be done with script which generates DOM.
By having a way to automatically generate markers,
many more advanced UI patterns can be solved in CSS.

## Proposal

The `::scroll-marker` pseudo-class will create a focusable marker which when activated will scroll the element into view.

```css
li::scroll-marker {
  content: "#";
}
```

The created scroll markers implement the [tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/), in particular:
* Implicitly form a group (similar to radio buttons) with all other scroll markers for the same scroller.
  Only one scroll marker is selected at a time.
* Only the active marker is focusable. E.g. focus will move to the active scroll marker, past any other inactive markers.
* When focus is on a scroll marker:
  * Left arrow moves focus to and activates the previous scroll marker.
  * Right arrow moves focus to and actives the next scroll marker.

In addition, these markers automatically respond to other scrolling operations.
When any scrolling operation takes place,
the first marker which is considered to be scrolled into view becomes selected.

## Example

Typically, scroll markers will be used with [grid-flow](../grid-flow/) to create navigation points.

See an [example](https://flackr.github.io/carousel/examples/scroll-marker/) built on the polyfill.
