# Stream example

This example uses the [streams](https://github.com/dotchain/streams)
package for data model synchronization.  It implements a TODO-MVC app
using the VDOM reconciler.

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

## Running the demo

The JS file can be bundled by running `yarn stream`.

A simple static http server can be started using `yarn stream_server`.

The TODO-MVC app can be accessed via http://localhost:8081
