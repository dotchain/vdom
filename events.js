"use strict";

// Events implements a declarative  event delegation framework.
//
// The constructor works with a WeakMap implementation (can be a
// polyfill).  The root DOM node is used for event delegation (all
// events are registered at the root node) except for specific events
// that do not bubble.
class Events {
  constructor(WeakMap, root, handler) {
    this._elts = new WeakMap();
    this._root = root;
    this._handler = handler;
    this._dispatcher = e => this._dispatch(e);
    this._counts = {};
  }

  update(elt, before, after) {
    const b = {};
    for (let key in before) b[key.toLowerCase()] = true;
    for (let key in after) {
      const value = after[key];
      key = key.toLowerCase();
      if (b[key]) this._update(elt, key, value);
      else this._add(elt, key, value);
      delete b[key];
    }
    for (let key in b) this._remove(elt, key);
  }

  _add(elt, key, value) {
    this._elts.set(elt, this._elts.get(elt) || {});
    this._elts.get(elt)[key] = value;
    if (!this.bubbles(key)) {
      elt.addEventListener(key, this._dispatcher);
    } else {
      const refcount = this._counts[key] || 0;
      this._counts[key] = refcount + 1;
      if (refcount === 0) this._root.addEventListener(key, this._dispatcher);
    }
  }

  _update(elt, key, value) {
    this._elts.get(elt)[key] = value;
  }

  _remove(elt, key) {
    const events = this._elts.get(elt);
    if (!events || !events.hasOwnProperty(key)) return;

    delete this._elts.get(elt)[key];
    if (!this.bubbles(key)) {
      elt.removeEventListener(key, this._dispatcher);
    } else {
      this._counts[key]--;
      if (this._counts[key] >= 1) return;
      delete this._counts[key];
      this._root.removeEventListener(key, this._dispatcher);
    }
  }

  _dispatch(e) {
    const events = this._elts.get(e.target);
    if (events && events.hasOwnProperty(e.type)) {
      return this._handler(e, events[e.type]);
    }
    this._remove(e.target, e.type);
  }

  bubbles(eventName) {
    const n = eventName;
    return n !== "move" && n !== "blur" && n !== "focus";
  }
}

exports.Events = Events;
