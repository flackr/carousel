# Flow into grid areas

## Problem

Often elements which are semantically together are best presented flowed into different areas.
One common example of this is tabs where it is nice to keep the tab with the contents for that tab,
but all tabs should be listed in a common area.

Being able to flow elements into different grid areas
makes the [fragmentation](../fragmentation/) and [scroll-marker](../scroll-marker/) proposals significantly more useful.
In particular, the markers can be pulled out from the content they link to into a common navigation area,
separate from the scrolling pages.

## Proposal

A new pseudo-element `::grid-flow` would allow the creation of a named grid flow container.
This container can be named by the `grid-flow` property to have those elements flow into that container.
The container can be given full additional styling.

```html
ul {
  display: grid;
  grid-template-areas: "main"
                       "markers";

  &::grid-flow(--main-flow) {
    overflow: auto;
    grid-area: main
  }

  &::grid-flow(--markers-flow) {
    grid-area: markers;
  }
}

li {
  grid-flow: --main-flow;
}

li::scroll-marker {
  content: "#";
  grid-flow: --markers-flow;
}
```

## Example

### Tabs

See the [example](https://flackr.github.io/carousel/examples/grid-flow/tabs/) using the polyfill.
