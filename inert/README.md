# CSS Inertness

## Problem

It is expected that for paginated carousel content,
only content on the active page is focusable /
included in the tab order.
This is typically accomplished through the use of Javascript,
as can be seen in the [Web Accessibility Initiative Carousel example](https://www.w3.org/WAI/tutorials/carousels/working-example/).

However, this should be simple to express and accomplish in CSS.

## Proposal

As been proposed previously in issue [#7201](https://github.com/w3c/csswg-drafts/issues/7021),
a new property `interactivity` would allow controlling inertness via CSS.
The proposed syntax would be:

```css
interactivity: auto | inert;
```

UA's could additionally include the following rule
explaining how this combines with the inert attribute:

```css
*[inert] {
  interactivity: inert;
}
```

## Example

### Carousel

A carousel could use this property to make items that are not in the current page inactive by combining with:

```css
carousel::fragment {
  interactivity: inert;
  &:has(::scroll-marker:checked) {
    interactivity: auto;
  }
}
```

This requires that we allow this property in [../fragmentation](fragment) styles,
and that we explain how it applies to children which are split across blocks,
i.e. that the interactivity of an element is `inert` if and only if every one of its fragment boxes is inert.
