# Expanded fragmentation styling

## Problem

Often developers want to automatically paginate content based on the available size.
This can be done today through the use of column fragmentation ([example](https://jsbin.com/modewaj/edit?html,output)),
though developers need access to a few additional styles to make these part of a carousel.
Specifically, developers need to be able to:
* Set scroll snap points on them.
* Implicitly create [scroll-markers](../scroll-marker/).

## Proposal

We propose a pseudoclass, which allows applying a limited set of styles to the generated fragments.
Specifically, this would be limited to styles which do not affect the layout,
and thus can be applied post-layout.

E.g. the following [example](https://jsbin.com/defazup/edit?html,output) automatically paginates a list of items snapping each page into view.
```css
ul {
  overflow: auto;
  container-type: size;
  columns: 1;
}
ul::fragment {
  scroll-snap-align: center;
}
```

This pseudoclass can additionally be used for the creation of [scroll-markers](../scroll-marker/):
```css
ul::fragment::scroll-marker {
  /* Marker styling */
}
```

## Example

See examples built on the polyfill:
* [Itemized block children](https://flackr.github.io/carousel/examples/fragmentation/)
* [Flowing content](https://flackr.github.io/carousel/examples/fragmentation/flowing/)

## Missing capabilities

While the above can handle straightforward cases, it is missing the ability to style a few interesting edge cases:

1. Peeking into subsequent pages.

   Column layouts force an integer number of columns per page.
   As such, it's not possible to make the next column partially visible with a slightly smaller width.

2. Making a block direction carousel.

   We likely need a way either for column overflow to flow in the block direction,
   or a way to apply page fragmentation within a block as we can do with columns.
