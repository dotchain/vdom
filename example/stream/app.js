"use strict";

const render = require("./render.js");
const streams = require("streams/es6");
const ui = require("./ui.js");
const { Events } = require("../../events.js");
const { update, reconciler } = require("../../index.es6.js");

export class App {
  constructor(window) {
    this._window = window;
    this.data = null;
    this.state = null;
    this.isRunning = false;
  }

  run() {
    this.isRunning = true;
    const body = this._window.document.body;
    body.innerHTML = "";
    const handler = (e, action) => this.handleEvent(e, action);
    const eventsManager = new Events(WeakMap, body, handler);
    this.reconciler = reconciler(body, eventsManager);

    const state = streams.wrap({ location: { hash: this._window.location.hash } });
    const data = streams.wrap({ todos: {} });
    this.rerender(data, state.withRef(["state"]));
    this.onAnimationFrame();
    return this;
  }

  onAnimationFrame() {
    if (!this.isRunning) {
      return;
    }

    this._window.requestAnimationFrame(() => this.onAnimationFrame());
    const data = this.data.latest();
    const state = this.state.latest();
    if (data !== this.data || state !== this.state) {
      this.rerender(data, state);
    }
  }

  pause() {
    this.isRunning = false;
  }

  rerender(data, state) {
    this.data = data;
    this.state = state;
    this.reconciler.reconcile(render.app(data, state));
    if (this._window.location.hash !== this.state.location.hash.valueOf()) {
      this._window.location.hash = this.state.location.hash.valueOf();
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

if (!module.parent) {
  const app = new App(global.window).run();
}
