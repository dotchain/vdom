# vdom

[![Build Status](https://travis-ci.com/dotchain/vdom.svg?branch=master)](https://travis-ci.com/dotchain/vdom)
[![codecov](https://codecov.io/gh/dotchain/vdom/branch/master/graph/badge.svg)](https://codecov.io/gh/dotchain/vdom)

This package implements a zero-dependency simple virtual DOM manager.

## Contents
1. [Installing](#installing)
2. [Principles](#principles)
3. [Implementation](#implementation)
    1. [Empty node](#empty-node)
    2. [Text node](#text-node)
    3. [Element](#element)
    4. [Fragment](#fragment)
        1. [Fragments are first-class](#fragments-are-first-class)
4. [API](#api)
    1. [Pure immutable renderers](#pure-immutable-renderers)
    2. [Almost immutable rerenderers](#almost-immutable-rerenderers)
5. [Events](#events)
6. [Server vs Client rendering](#server-vs-client-rendering)
7. [Testing](#testing)
8. [Demos](#demos)

## Installing

The vdom package is not avaiable in npm. Install this direclty from
github via `npm add https://github.com/dotchain/vdom` or
`yarn add https://github.com/dotchain/vdom`.

## Principles

1. **Be declarative.** No specific methods to mutate the DOM. 
2. **Compose well.** The full app can be rendered in parts and
composed together.
3. **Be agnostic of frameworks.** Allow immutable/mutable data models
and custom event management setups.  Virtual DOM deals only with
rendering and reconciling (i.e applying differences ot real DOM).
4. **Performant** Support moderately large DOMs with little to no
performance penalty.  Extremely large DOMs are not a direct target.

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
contents}`.

* `tag` is the tag name.
* `props` are DOM properties or attributes.
* `key` is an locally unique id to help with perf of re-ordered nodes
* `contents` can be an empty node, a text node or another element or a
fragment.
* `events` is a hash of DOM event-name to opaque event data. See
[events](#events).

### Fragment

Fragments are ordered collections where each item in the collection
can be an empty node, text node, an element or another fragment.

Fragments can be represented in two different ways: as a simple array
or as an object of the form `{nodes: [ ]}`.  The simpler form is
useful for the `contents` field of an Element while the later form is
useful when a fragment is meant to be rerendered on its own.

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

#### Fragments are first-class

Fragments are effectively treated as first-class objects.  For
instance, the top-level VDOM entry is expected to be a fragment (and
so multiple nodes can be created that way).  Any situation where a
single element is expected, a fragment can be used leading to useful
nesting behaviors:

```js
{
  tag: 'div',
  props: {...},
  contents: [
    {tag: ..},
    [
      // nesting!
    ]
 ]
}
```

This allows a component to return a fragment when it is rendered
without resorting to container divs.


#### Static HTML content

It is possible to inject static HTML content at any node by using
`{htmlUnsafe: "<svg ...></svg>"}` 

This is useful for injecting SVG icons for example. The injected HTML
is expected to be a single node though and not a fragment.

These nodes are replaced if there is any change in the html -- there
is no attempt to be smart and reuse nodes in this case.

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
and returns the vdom using direct function composition:

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
  const data = ...; // sync this data
  const events = ...; // create event manager
  const r = reconciler(root, events);

  // rerender the app on each animation refresh
  const loop = () =>  window.requestAnimationFrame(() => {
    loop();
    r.reconcile(render.app(data));
  });
}
```

See the [stream
demo](https://github.com/dotchain/vdom/blob/master/example/stream/README)
for a stream-based TODO-MVC demo using this method.

The approach above causes a full rerender into virtual DOM, on every
animation refresh.  But since virtual DOM rerenders are efficient
(reconcile only uses differences in the virtual DOM to patch up the
underlyling real DOM), for most use cases this works fine.

### Almost immutable rerenderers

If the virtual DOM is relatively large or expensive to reconstruct, an
app can take advantage of the fact that the `reconcile` method can handle
partial sub-tree changes.  Each renderer has its own mechanism to
detect when it has to be updated (maybe using data models that have
subscriptions) and when this happens, it simply adds the newly
rendered virtual sub-tree as a `next` property of the last rendering.

In this model, only one direct `render` call is made by the initial
app with each component updating its own `next` field:

```js
function main() {
  const data = ...; // sync this data
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

An example `delegated events` implementation is available in
`vdom/events.js`:

```js
   const {reconciler} = require('vdom');
   const {Events} = require('vdom/events.js');
   const handler = (event, vdomData) => ....;
   const r = reconciler(root, new Events(WeakMap, root, handler, {});
```

The `events` property (see [element](#element)) can specify DOM events
and their associated data. When the corresponding event fires, the
handler (in the example above) will be called both with the actual DOM
event and the data from the events hash.  This allows event handlers
to be implemented.

An example `click` handler setup for a button:

```js
const render = {
  // renderer sets up click event
  button(label, clickData) {
    const events = {click: clickData};
    return {tag: 'button', props: {}, events, contents: {text: label}};
  },
  app(data) {
    ...
  }
}

function main() {
   const {reconciler} = require('vdom');
   const {Events} = require('vdom/events.js');
   const handler = (event, data) => {
     if (event.type == 'click') {
        // data == clickData.  Do whatever action is needed!
     }
   };
   const r = reconciler(root, new Events(WeakMap, root, handler, {});
   r.reconcile(render.app(data))
}
```

See
[ui.js](https://github.com/dotchain/vdom/blob/master/example/stream/ui.js)
for an example event handler (function `handle`).

## Server vs Client rendering

The reconciler used here allows renderers to emit raw JSON.  While the
reconciler itself is not of any value in a server-rendering setup,
this split allows a server rendering to be rather trivial. Infact,
using the [jsdom](https://github.com/jsdom/jsdom) package, the actual
rendering to HTML can be done trivially like so:

```js

const {JSDOM} = require('jsdom');
cosnt {Events} = require('vdom/events.js');
const {reconciler} = require('vdom');

function toHTML(...) {
  const dom = new JSDOM(`<!DOCTYPE html><div></div>`);
  const root = dom.window.document.querySelector('div');
  const eventsManager = new Events(WeakMap, root);
  const r = reconciler(root, eventsManager);
  r.reconcile(...render the app vdom...);
  return dom.serialize();
}
```

Note that the events manager provided does not serialize event
handlers properly because most events do not map cleanly to server
side implementations.  Instead, the renderers used should generate
html form action URLs to make things work with server rendering.

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

