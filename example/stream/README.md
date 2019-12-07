# Stream example

This example uses the [streams](https://github.com/dotchain/streams)
package for data model synchronization.  It implements a TODO-MVC app
using the VDOM reconciler.

## Contents
1. [Running the demo](#running-the-demo)
2. [Code organization](#code-organization)
3. [How the demo works](#how-the-demo-works)
    1. [Handling state streams.](#handling-state-streams)
    2. [Standard actions.](#standard-actions)
    3. [Custom actions.](#custom-actions)

## Running the demo

The `app.js` file can be bundled (into `app.dist.js`) by running `yarn stream`.

A simple static http server for the TODO-MVC can be started using `yarn stream_server`.

The TODO-MVC app can then be accessed via http://localhost:8081

## Code organization

* `app.js` contains the main app entrypoint and the global event
handlers.
* render.js has all the core renderers.  Each render is a simple pure
function that takes its data model and a state model.  The state model
allows modeling UI state pretty much the same way as shared app
state. In fact, in `app,js`, state is created as a stream (though
unlike `data`, the `state` is never synchronized between clients).
* ui.js has a bunch of low-level UI primitives that would be present
in most high-level UI tool kits.  Of particular interest is that most
form elements have `two-way bindings` where DOM events have
sufficient information for the `handle` call to apply them.  Some
events (like clearing all completed todos) is harder to do and so
these are handled explicitly by the `App` class.

## How the demo works

The renderers generally accept two
[streams](https://github.com/dotchain/streams) args:

* **data** holds the data relevant to the renderer (such as a todo
    item or the list of todo items). This is persisted on the server.
* **state** holds the session state local to the browser.  This is
    setup in
    [app.js](https://github.com/dotchain/vdom/blob/master/example/stream/app.js).

The basic low-level UI primitives are implemented in
[ui.js](https://github.com/dotchain/vdom/blob/master/example/stream/ui.js).
The text input is a good example which illustrates how mutations work:

```js
function text(s) {
  const events = { keyup: replace(s) };
  const props = { type: "text", value: s.valueOf() || "" };
  return { tag: "input", props, events, contents: {} };
}
```

The `events` property is wired with `keyup` event handlers. These map
to the `replace(s)` action which itself is simply just the hash
`{replace: s.ref()}`.  The `ref()` call implemented by the
[streams](https://github.com/dotchain/streams) package simply returns
the full path to the stream being used.  For instance, if the text was
mapped to `data.todos.get(id).description`, the `ref` would be
`['todos', id, 'description']`.

In the button example, this would make the `events` property be
something like `{keyup: {replace: ['todos', id, 'description']}}`.

The actual events handler is setup in
[app.js](https://github.com/dotchain/vdom/blob/master/example/stream/app.js)
(handleEvent function) which routes to the `handle` method in
[ui.js](https://github.com/dotchain/vdom/blob/master/example/stream/ui.js)
which then resolves the path into the correct stream object and
updates it accordingly.

### Handling state streams.

The `state` streams are a bit different in that they are rooted at a
different object. So,
[app.js](https://github.com/dotchain/vdom/blob/master/example/stream/app.js)
sets up the `state` stream to have a initial prefix of `['state']`
which the event handler then uses to route to the right stream.

    TODO: This can be vastly improved by using the `object` function
    from the streams package.


### Standard actions.

A set of standard actions are implemented in
[ui.js](https://github.com/dotchain/vdom/blob/master/example/stream/ui.js):

* replacing a stream with the value from the current form element:
  `replace(s)`
* replacing a stream with a fixed value: `replace(s, value)`
* replacing a strean with a fixed hash but with one or more properties
  whose value is from another stream: `repalce(s, {xyz:
  anotherStream})`. This is interesting because the `anotherStream`
  itself can be live-bound to another `input` element.  It can also be
  used to ensure that the replace value for `xyz` is the current value
  at the time of mutation.  The same `ref` based trick is used here to
  make this happen.
* multiple actions can be just grouped together to form an array.
* appending: all collections are just maps, so appending is just a
  matter of using a new unique ID for the collection.  In the TODO-MVC
  app, this is done by using `uuidv4()` as the unique key generator.


### Custom actions.

Custom actions are not fully fleshed out.  It is common for individual
renderers to have custom actions that are local to it. The current
solution in the example is to set up the action to be a unique string
(such as `clear_completed`) and then have the action be implemented
globally by `App` (i..e via the `handleEvent` method in
[app.js](https://github.com/dotchain/vdom/blob/master/example/stream/app.js)).

A better model would be a custom-action registration mechanism in
ui.js.


