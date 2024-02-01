# Carousel explainer

Explainer for a set of features allowing the creation of CSS customizable carousels.

## Background

Carousels are an often used design pattern on the web.
They are used in a variety of contexts,
from product listing pages to slideshow like content.
OpenUI has [explored a range of carousel designs](https://open-ui.org/components/carousel.research/),
showing that the specific layout and appearance can vary dramatically.
They are also provided by many frameworks as components,
however implementing a carousel correctly is complicated
and often results in inconsistent and sometimes inaccessible implementations.

There are a [variety of problems being solved by carousels](https://css.oddbird.net/overflow/explainer/),
which we believe could be provided by a set of CSS features.
Developers could then combine these CSS features to create the various designs.
CSS-only component libraries could be built to further simplify this process.

## The features

### Stylable fragmentation

Carousels often show multiple items as a single group.
Typically the user advances through one group at time.

See the [fragmentation](fragmentation/) explainer for more details. 

### Scroll markers

Many carousels have markers or thumbnails
which provide convenient navigation
and a sense of overall progress through the carousel.

See the [scroll-marker](scroll-marker/) explainer for more details.

### Flow into grid areas

Scroll markers, and sometimes other inline content often needs to be placed into a different grid area.
Multiple items placed into the same grid area should be able to flow relative to each other.
Futher, it may be necessary to allow scrolling on the collection of items placed in an area when it overflows.

See the [grid-flow](grid-flow/) explainer for more details.

### Scroll buttons

Many carousels provide buttons for direct navigation to the next / previous item or page of content.
While they could create these `<button>` elements as part of the page,
they are not semantically part of the list of items.
Further, the code for these adds a bit of additional complexity.

See the [scroll-button](scroll-button/) explainer for more details.

## Examples

Using the above features, a carousel can be implemented as a semantic list of items, e.g.:

```html
<ul class="carousel">
  <li>Item 1</li>
  <li>Item 2</li>
  ...
```
</ul>

Where the CSS can turn this into a variety of carousel designs.

### Paginated image carousel

The CSS automatically flows the list items into page container pseudo-elements
which have individual snap points and scroll markers.

Examples using the polyfill:
* [Paginated marker example](https://flackr.github.io/carousel/examples/carousel/image/)
* [Thumbnails example](https://flackr.github.io/carousel/examples/carousel/thumbnails/)

## Alternatives

There are many other ways that we could deliver these capabilities.
This section will collect other potential alternatives with their callenges and advantages.

### &lt;carousel&gt; element

An element could encapsulate a lot of the features without needing to express them directly as CSS properties.
One of the main challenges with this approach is that carousels have a large amount of variation in their designs.
This would likely add significant complexity to the design of a high level element,
or require some of the individual features proposed anyways.

### Templated content

It would be nice for authors to be able to slot in rich content,
as they would with a custom element.
For example, they could provide a template of content to be created per page
with a slot for the contents of that page.

One challenge is that the original content should retain its original structure.
This may be possible by dynamically slotting elements to particular pages in a shadow tree.
