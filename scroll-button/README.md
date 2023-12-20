# Scroll-*-button

## Proposal

Allow the creation of interactive scroll buttons as pseudoclasses, e.g.

```css
.scroller {
  overflow: auto;
}

.scroller::scroll-down-button {
  content: "v";
}

.scroller::scroll-up-button {
  content: "^";
}
```

These should be focusable, behaving as a button.
When activated, a scroll should be performed in the direction by some amount.
When it is not possible to scroll in that direction, they should be disabled.

## Open questions

### Amount to scroll

What is the standard amount for a scroll? Options:
* One page
* Equivalent to pressing that direction on the keyboard

There are use cases where scrolling by a page at a time is nice.
There are also use cases where scrolling one item (e.g. with scroll snap areas) is preferable.

## Example

See the [example](https://flackr.github.io/carousel/examples/scroll-button/) using the polyfill.
