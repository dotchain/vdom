# vdom

[![Build Status](https://travis-ci.com/dotchain/vdom.svg?branch=master)](https://travis-ci.com/dotchain/vdom)
[![codecov](https://codecov.io/gh/dotchain/vdom/branch/master/graph/badge.svg)](https://codecov.io/gh/dotchain/vdom)

This package implements a zero-dependency simple virtual DOM manager.

## Contents

## Principles

1. **Be declarative.** No specific methods to mutate the DOM. 
2. **Compose well.** The full app can be rendered in parts and
composed together.
3. **Be agnostic of frameworks.** That is, there are very few
assumptions about how data/model changes are manages/propagated or how
event/state managemen works.  Virtual DOM deals only with rendering
and re-rendering. 
4. **Performant** Support moderately large DOMs with little to no
performance penalty.  Extremely large DOMs may not necessarily be as
performant. 

## Implementation

The virtual DOM is an almost immutable JSON object. For example, a
list would look like this:

```js
{
  tag: 'ul',
  props: {},
  contents: [
    {
      tag: 'li',
      props: {},
      contents: {text: "First line"}
    },
    {
      tag: 'li',
      props: {},
      contents: {text: "Second line"}
    }
  ]
}
```

Conforming to the `immutable` pattern, changes are not directly
applied to the JSON. Instead, changes are indicated via a `next`
pointer: any sub-tree that needs to be modified simply has a `next`
field set to the updated sub-tree.  For instance, changing the text
from `First line` to `First list entry` would be done via:

```js
{
  tag: 'ul',
  props: {},
  contents: [
    {
      tag: 'li',
      props: {},
      contents: {text: "First line", next: {text: "First list entry"}}
    },
    {
      tag: 'li',
      props: {},
      contents: {text: "Second line"}
    }
  ]
}
```

### Empty node

An empty node is represented via an empty object `{}` rather than
null. This is so that a next field can be specified if the sub-tree
were to be modified on a re-render.

### Text node

Text nodes are represented via an object `{text: string}`.

### Element

Elements are represented via an object `{tag, props, key, events,
contents}` where contents is itself an empty node or text node or
element or a fragment. The optional `key` property tracks the `key`
(so reordering of nodes can be done efficiently).  The optional
`events` property is a map of DOM-events to an opaque event data. This
hash is expected to be managed by the events manager (see
[Events](#events)).

### Fragment

Fragments are ordered collections where each item in the collection
can be an empty node, text node, an element or another fragment.

Fragments can be represented in two different ways: as a simple array
or as an object of the form `{nodes: [ ]}`.  The simpler form is
useful for the `contents` field of an Element while the later form is
useful when a frament is meant to be rerendered on its own.

For example, a subtree may consist of a node with two sets of
children that update independently:

```js
{
  tag: "div",
  props: { ... },
  contents: [
    {nodes: [..]}, // fragment #1
    {nodes: [..]}, // fragment #2
  ]
}
```

Having the separate objects of the form `{nodes}` allows each of those
to independently have a `next` field.

## Installing

The vdom package is not avaiable in npm. Install this direclty from
github via `npm add https://github.com/dotchain/vdom` or
`yarn add https://github.com/dotchain/vdom`.

## API

A new instance of a reconciler can be created like so:

```js
  const {reconciler} = require('vdom');
  const r = reconciler(root, eventsManager);
```

The `root` parameter refers to a real DOM node that is the container
for the virutal DOM. The `eventsManager` is the implementation of
declarative events.  An example `delegated events` implementation is
provided in `vdom/events.js` (see [Events](#events)) 

### Pure immutable renderers

For small apps, the easiest implementtion of rendering is to use pure
immutable vdoms.  Each renderer is simply a function that uses state
and returns the vdom and using direct function composition:

```js
const render = {
  app(data) {
    return items(data);
  },
  items(data) {
    return {
      tag: 'ul',
      props: {},
      events: {},
      contents: data.map(entry => item(entry))
    };
  },
  item(data) {
    return {
      tag: 'li',
      props: {},
      contents: {text: data.description},
    };
  }
};
```

When using an approach like this, the reconciler is typically updated
like so:

```js
function main() {
  this.data = ...; // sync this data
  const events = ...; // create event manager
  const r = reconciler(root, events);

  // render the app!
  const loop = () =>  window.requestAnimationFrame(() => {
    loop();
    r.reconcile(render.app(data));
  });
}
```

See [stream
demo](https://github.com/dotchain/vdom/blob/master/example/stream/README)
for a stream-based TODO-MVC demo,

The approach above causes a full rerender into virtual DOM, on every
animation refresh.  But since virtual DOM rerenders are efficient
(reconcile only uses differences in the virtual DOM to patch up the
underlyling real DOM), for most use cases this works fine.

### Almost immutable rerenderers

If the virtual DOM is relatively large or expensive to reconstruct, an
app can take advantage of the fact that the `reconcile` method apply
partial sub-tree changes.  Each renderer has its own mechanism to
detect when it has to be updated (maybe using data models that have
subscriptions) and when this happens, it simply adds the newly
rendered virtual sub-tree as a `next` property of the last rendering.

In this model, only one direct `render` call is made by the initial
app with each component updating its own `next` field:

```js
function main() {
  this.data = ...; // sync this data
  const events = ...; // create event manager
  const r = reconciler(root, events);

  // render the app once. the renderers are responsible for
  // updates (which simply set the {next} field of the last
  // rendering to be the current one.
  r.reconcile(render.app(data));
  
  const loop = () =>  window.requestAnimationFrame(() => {
    loop();
    // vdom represents the current v-dom, which may have embedded
    // {next} properties.  r.reconcile(..) works through those.
    r.reconcile(r.vdom);
  });
}
```

## Events

An example `delegated events` implementation is available vai
`vdom/events.js`:

```js
   const {reconciler} = require('vdom');
   const {Events} = require('vdom/events.js');
   const handler = (event, vdomData) => ....;
   const r = reconciler(root, new Events(WeakMap, root, handler, {});
```

The [element](#element) virtual DOM object has an `events` property
that allows specifying events and associated data.  When the
corresponding event fires, the handler will be called both with the
actual DOM event and the virtual data from the events hash.  This
allows event handlers to be implemented.

See
[ui.js](https://github.com/dotchain/vdom/blob/master/example/stream/ui.js)
for an example event handler (function `handle`).

## Testing

```bash
yarn install # use npm if you prefer that
yarn test # use npm if you prefer that
```

## Demos

An implementation which uses
[streams](https://github.com/dotchain/streams) for data model
synchronization is available in the
[example/stream](https://github.com/dotchain/vdom/blob/master/example/stream)
folder. 