"use strict";

const sinon = require("sinon");
const { App } = require("./app.js");
const { Events } = require("../../events.js");
const { createWindow } = require("../../test_helper.js");
const { expect } = require("../../expect.js");
const { latest, update, reconciler } = require("../../index.es6.js");

function text(s) {
  return { text: s };
}

function div(key, props, contents) {
  return elt("div", key, props, contents);
}

function elt(tag, key, props, contents) {
  props = props || {};
  contents = contents || {};
  if (key) return { tag, key, props, contents };
  return { tag, props, contents };
}

describe("app", () => {
  let doc, win, root, app;

  beforeEach(() => {
    win = createWindow("<!DOCTYPE html><body><p>abcd</p></body>");
    doc = win.document;
    root = win.document.querySelector("p");
    app = new App(win);
  });

  afterEach(() => {
    app.pause();
  });

  it("does not clear content in constructor", () => {
    const para = doc.querySelector("p");
    expect(para.outerHTML).to.equal("<p>abcd</p>");
  });

  it("clears all content when run", () => {
    app.run();
    const para = doc.querySelector("p");
    expect(para).to.equal(null);
  });

  it("registers with requestAnimationFrame", () => {
    win.requestAnimationFrame = sinon.spy();
    expect(win.requestAnimationFrame.callCount).to.equal(0);
    app.run();
    expect(win.requestAnimationFrame.callCount).to.equal(1);
  });

  it("sets running state", () => {
    expect(app.isRunning).to.equal(false);
    app.run();
    expect(app.isRunning).to.equal(true);
    app.pause();
    expect(app.isRunning).to.equal(false);
  });

  it("creates text node", () => {
    const r = reconciler(root, new Events(WeakMap, root));
    r.reconcile(text("Hello World"));
    expect(root.innerHTML).to.equal("Hello World");
  });
});
