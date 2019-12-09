"use strict";

const streams = require("streams/es6");
const { Events } = require("../../events.js");
const { update, reconciler } = require("../../index.es6.js");
const ui = require("./ui.js");
const render = require("./render.js");

class App {
  constructor() {
    const root = document.body;
    root.innerHTML = "";
    const handler = (e, action) => this.handleEvent(e, action);
    const eventsManager = new Events(WeakMap, root, handler);
    this.reconciler = reconciler(root, eventsManager);
    this.data = null;
    this.state = null;
  }

  run() {
    const state = streams.wrap({ location: { hash: window.location.hash } });
    const data = streams.wrap({ todos: {} });
    this.rerender(data, state.withRef(["state"]));
    requestAnimationFrame(() => this.onAnimationFrame());
  }

  onAnimationFrame() {
    requestAnimationFrame(() => this.onAnimationFrame());
    const data = this.data.latest();
    const state = this.state.latest();
    if (data !== this.data || state !== this.state) {
      this.rerender(data, state);
    }
  }

  rerender(data, state) {
    this.data = data;
    this.state = state;
    this.reconciler.reconcile(render.app(data, state));
    if (window.location.hash !== this.state.location.hash.valueOf()) {
      window.location.hash = this.state.location.hash.valueOf();
    }
  }

  handleEvent(e, action) {
    // global non-stream actions are handled here directly
    if (action === "clear_completed") {
      return this.clearCompleted();
    }
    if (action.hasOwnProperty("setAll")) {
      e.preventDefault();
      return this.setAll(action.setAll);
    }
    return ui.action.handle(this.data, this.state, e, action);
  }

  clearCompleted() {
    this.data.todos.forEachKey(key => {
      const todo = this.data.todos[key];
      if (!todo.deleted.valueOf() && todo.completed.valueOf()) {
        todo.deleted.replace(true);
      }
    });
  }

  setAll(completed) {
    this.data.todos.forEachKey(key => {
      const todo = this.data.todos[key];
      if (!todo.deleted.valueOf()) {
        todo.completed.replace(completed);
      }
    });
  }
}

new App().run();
