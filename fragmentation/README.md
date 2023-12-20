# Stylable fragmentation

## Problem

Often developers want to automatically paginate content based on the available size.
This can be done today through the use of column fragmentation ([example](https://jsbin.com/modewaj/edit?html,output)),
however there only a small set of styles which can be applied to columns.
In general, it would be nice to be able to:
* Set scroll snap points on them.
* Implicitly create [scroll-markers](../scroll-marker/).
* Apply padding, borders, change content alignment.

## Proposal

We propose a new property, which automatically fragments content into stylable container pseudo-elements.
E.g. the following automatically paginates a list of items and centers the items which fit on each page.

```css
ul {
  display: flex;
  fragment: element;
  overflow: auto;
}
ul::fragment {
  scroll-snap-slign: center;
  display: flex;
  justify-content: center;
}
```

## Open questions

### Breaking fragmentation

There are use cases for breaking fragmentation,
e.g. see the [flowing paragraphs example](https://jsbin.com/modewaj/edit?html,output).
If allowed this case would have to be significantly restricted in terms of the layout that could be applied per fragment.

## Example

See an [example](https://flackr.github.io/carousel/examples/fragmentation/) built on the polyfill.