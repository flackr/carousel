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
  display: flex;
  overflow: auto;
  container-type: size;
  column-width: 100cqw;
}
ul::fragment {
  scroll-snap-slign: center;
}
```

This pseudoclass could additionally be used for the creation of [scroll-markers](../scroll-marker/):
```css
ul::fragment::scroll-marker {
  /* Marker styling */
}
```

## Example

An example will be coming once the polyfill is updated to support it.