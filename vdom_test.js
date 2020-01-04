"use strict";

const { expect } = require("./expect.js");
const { latest, update, reconciler } = require("./index.es6.js");
const { Events } = require("./events.js");
const { JSDOM } = require("jsdom");

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

describe("vdom", () => {
  it("creates text node", () => {
    const dom = new JSDOM(`<!DOCTYPE html><p></p>`);
    const root = dom.window.document.querySelector("p");
    const r = reconciler(root, new Events(WeakMap, root));
    r.reconcile(text("Hello World"));
    expect(root.innerHTML).to.equal("Hello World");
  });

  it("creates an element #1", () => {
    const dom = new JSDOM(`<!DOCTYPE html><p></p>`);
    const root = dom.window.document.querySelector("p");
    const r = reconciler(root, new Events(WeakMap, root));
    r.reconcile(
      div(null, { id: "x" }, [text("Hello"), div(null, null, text("World"))])
    );
    expect(root.innerHTML).to.equal(`<div id="x">Hello<div>World</div></div>`);
  });

  it("creates an element #2", () => {
    const dom = new JSDOM(`<!DOCTYPE html><p></p>`);
    const root = dom.window.document.querySelector("p");
    const r = reconciler(root, new Events(WeakMap, root));
    r.reconcile(
      div(
        null,
        { id: "x" },
        { nodes: [text("Hello"), div(null, null, text("World"))] }
      )
    );
    expect(root.innerHTML).to.equal(`<div id="x">Hello<div>World</div></div>`);
  });

  it("updates text node", () => {
    const dom = new JSDOM(`<!DOCTYPE html><p></p>`);
    const root = dom.window.document.querySelector("p");
    const r = reconciler(root, new Events(WeakMap, root));

    r.reconcile(text("Hello World"));
    r.reconcile(text("Heyo"));
    expect(JSON.stringify(r.vdom)).to.equal(`{"text":"Heyo"}`);
    expect(root.innerHTML).to.equal("Heyo");
  });

  it("updates an element #1", () => {
    const dom = new JSDOM(`<!DOCTYPE html><p></p>`);
    const root = dom.window.document.querySelector("p");
    const r = reconciler(root, new Events(WeakMap, root));
    r.reconcile(
      div(
        null,
        { id: "x" },
        {
          nodes: [text("Hello"), div(null, null, text("World"))]
        }
      )
    );
    expect(root.innerHTML).to.equal(`<div id="x">Hello<div>World</div></div>`);

    r.reconcile(div(null, { id: "y" }, r.vdom.contents));

    expect(JSON.stringify(r.vdom)).to.equal(
      JSON.stringify({
        tag: "div",
        props: { id: "y" },
        contents: {
          nodes: [
            { text: "Hello" },
            { tag: "div", props: {}, contents: { text: "World" } }
          ]
        }
      })
    );
    expect(root.innerHTML).to.equal(`<div id="y">Hello<div>World</div></div>`);
  });

  it("updates an element #2", () => {
    const dom = new JSDOM(`<!DOCTYPE html><p></p>`);
    const root = dom.window.document.querySelector("p");
    const r = reconciler(root, new Events(WeakMap, root));
    r.reconcile(
      div(null, { id: "x" }, [text("Hello"), div(null, null, text("World"))])
    );
    expect(root.innerHTML).to.equal(`<div id="x">Hello<div>World</div></div>`);

    r.reconcile(
      div(null, { id: "y" }, [text("Hello"), div(null, null, text("World"))])
    );

    expect(JSON.stringify(r.vdom)).to.equal(
      JSON.stringify({
        tag: "div",
        props: { id: "y" },
        contents: {
          nodes: [
            { text: "Hello" },
            { tag: "div", props: {}, contents: { text: "World" } }
          ]
        }
      })
    );
    expect(root.innerHTML).to.equal(`<div id="y">Hello<div>World</div></div>`);
  });

  it("updates props and contents of an element", () => {
    const dom = new JSDOM(`<!DOCTYPE html><p></p>`);
    const root = dom.window.document.querySelector("p");
    const r = reconciler(root, new Events(WeakMap, root));
    r.reconcile(
      div(
        null,
        { id: "x" },
        {
          nodes: [text("Hello"), div(null, null, text("World"))]
        }
      )
    );
    expect(root.innerHTML).to.equal(`<div id="x">Hello<div>World</div></div>`);

    r.vdom.props.next = { id: "y" };
    r.vdom.contents.next = { nodes: [text("Boo")] };

    expect(JSON.stringify(r.reconcile(r.vdom))).to.equal(
      JSON.stringify({
        tag: "div",
        props: { id: "y" },
        contents: {
          nodes: [{ text: "Boo" }]
        }
      })
    );
    expect(root.innerHTML).to.equal(`<div id="y">Boo</div>`);
  });

  it("updates text node to element", () => {
    const dom = new JSDOM(`<!DOCTYPE html><p></p>`);
    const root = dom.window.document.querySelector("p");
    const r = reconciler(root, new Events(WeakMap, root));
    r.reconcile(
      div(
        null,
        { id: "x" },
        {
          nodes: [text("Hello"), div(null, null, text("World"))]
        }
      )
    );
    expect(root.innerHTML).to.equal(`<div id="x">Hello<div>World</div></div>`);

    r.vdom.contents.nodes[0].next = {
      tag: "div",
      props: {},
      contents: { text: "Hello" }
    };

    expect(JSON.stringify(r.reconcile(r.vdom))).to.equal(
      JSON.stringify({
        tag: "div",
        props: { id: "x" },
        contents: {
          nodes: [
            { tag: "div", props: {}, contents: { text: "Hello" } },
            { tag: "div", props: {}, contents: { text: "World" } }
          ]
        }
      })
    );
    expect(root.innerHTML).to.equal(
      `<div id="x"><div>Hello</div><div>World</div></div>`
    );
  });

  it("adds chilren", () => {
    const dom = new JSDOM(`<!DOCTYPE html><p></p>`);
    const root = dom.window.document.querySelector("p");
    const r = reconciler(root, new Events(WeakMap, root));
    r.reconcile(
      div(
        null,
        { id: "x" },
        { nodes: [text("Hello"), div(null, null, text("World"))] }
      )
    );
    expect(root.innerHTML).to.equal(`<div id="x">Hello<div>World</div></div>`);

    r.vdom.contents.next = {
      nodes: [
        text("Hello"),
        div(null, null, text("World")),
        div(null, null, text("!"))
      ]
    };
    expect(JSON.stringify(r.reconcile(r.vdom))).to.equal(
      JSON.stringify({
        tag: "div",
        props: { id: "x" },
        contents: {
          nodes: [
            { text: "Hello" },
            { tag: "div", props: {}, contents: { text: "World" } },
            { tag: "div", props: {}, contents: { text: "!" } }
          ]
        }
      })
    );
    expect(root.innerHTML).to.equal(
      `<div id="x">Hello<div>World</div><div>!</div></div>`
    );
  });

  it("re-orders elements", () => {
    const dom = new JSDOM(`<!DOCTYPE html><p></p>`);
    const root = dom.window.document.querySelector("p");
    const r = reconciler(root, new Events(WeakMap, root));
    r.reconcile({
      nodes: [
        { text: "Hello World", key: "one" },
        { text: "Boo", key: "two" }
      ]
    });
    expect(root.innerHTML).to.equal("Hello WorldBoo");
    const c1 = root.firstChild;
    const c2 = c1.nextSibling;
    r.reconcile({
      nodes: [
        { text: "Goop", key: "two" },
        { text: "Boop", key: "one" }
      ]
    });
    expect(root.innerHTML).to.equal("GoopBoop");
    expect(root.firstChild).to.equal(c2);
    expect(root.firstChild.nextSibling).to.equal(c1);
  });
});

describe("vdom+events", () => {
  [true, false].map(direct => {
    const suffix = " (direct = " + direct + ")";
    const name = direct ? "move" : "click";
    const events = { [name]: "hello" };
    const events2 = { [name]: "hello" };

    it("adds event handlers" + suffix, () => {
      const dom = new JSDOM(`<!DOCTYPE html><p></p>`);
      const root = dom.window.document.querySelector("p");
      const fired = [];
      const handler = (e, value) => fired.push(value);
      const r = reconciler(root, new Events(WeakMap, root, handler));

      const spec = div(null, {});
      spec.events = events;
      r.reconcile(spec);

      const e = new dom.window.MouseEvent(name, { bubbles: !direct });
      root.firstChild.dispatchEvent(e);
      expect(fired).to.deep.equal(["hello"]);
    });

    it("updates event handlers" + suffix, () => {
      const dom = new JSDOM(`<!DOCTYPE html><p></p>`);
      const root = dom.window.document.querySelector("p");
      const fired = [];
      const handler = (e, value) => fired.push(value);
      const r = reconciler(root, new Events(WeakMap, root, handler));

      r.reconcile(Object.assign(div("boo"), { events }));
      r.reconcile(Object.assign(div("boo"), { events: events2 }));

      const e = new dom.window.MouseEvent(name, { bubbles: !direct });
      root.firstChild.dispatchEvent(e);
      expect(fired).to.deep.equal([events2[name]]);
    });

    it("deletes event handlers" + suffix, () => {
      const dom = new JSDOM(`<!DOCTYPE html><p></p>`);
      const root = dom.window.document.querySelector("p");
      const fired = [];
      const handler = (e, value) => fired.push(value);
      const r = reconciler(root, new Events(WeakMap, root, handler));

      r.reconcile(Object.assign(div("boo"), { events }));
      r.reconcile(div("boo", {}));

      const e = new dom.window.MouseEvent(name, { bubbles: !direct });

      root.firstChild.dispatchEvent(e);
      expect(fired.length).to.equal(0);
    });

    if (direct) return;

    it("refcounts properly", () => {
      const dom = new JSDOM(`<!DOCTYPE html><p></p>`);
      const root = dom.window.document.querySelector("p");
      const fired = [];
      const handler = (e, value) => fired.push(value);
      const r = reconciler(root, new Events(WeakMap, root, handler));

      r.reconcile(
        Object.assign(div("boo", {}, [Object.assign(div("boo"), { events })]), {
          events: events2
        })
      );
      r.reconcile(Object.assign(div("boo"), { events: events2 }));

      const e = new dom.window.MouseEvent(name, { bubbles: !direct });
      root.firstChild.dispatchEvent(e);
      expect(fired).to.deep.equal([events2[name]]);

      r.reconcile(div("boo", {}));

      root.firstChild.dispatchEvent(e);
      expect(fired).to.deep.equal([events2[name]]);
    });
  });
});
