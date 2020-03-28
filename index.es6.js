"use strict";

const isText = spec => spec.hasOwnProperty("text");
const isHTML = spec => spec.hasOwnProperty("htmlUnsafe");
const latest = x => {
  while (x.next) x = x.next;
  return x;
};

exports.reconciler = reconciler;

// reconciler takes a root DOM node and an events manager.
//
// The return value is an object with a `vdom` property and a
// `reconcile` method.
//
// The vdom property tracks the current effective vdom.
//
// The reconcile method takes a new vdom representing the children of
// the root DOM. It compares this with the last vdom and applies the
// patches to the real root DOM (ensuring its children line up to the
// provided spec).  It returns the current effective vdom.
//
// The vdom can either be treated as totally immutable (i.e new vdom
// is not connected to older in any way).  The older vdom can also be
// updated via a `next` field to specify the newer version of it (at
// any level in the subtree).  When used like this, the reconcile
// method can be passed the current vdom as argument.
//
// The events arg to the reconciler is expected to manage declarative
// events. A delegated events manager is provided in events.js
// (`require("vdom/events.js")`) and this also can be used as the
// basis for an event manager implementation.
function reconciler(root, events) {
  const r = new Reconciler(root.ownerDocument, events);
  let vdom = {};

  return {
    get vdom() {
      return vdom;
    },
    reconcile(json) {
      vdom = r.reconcile(root, vdom, json);
      return vdom;
    }
  };
}

// Reconciler does actual reconciliation of vdom changes onto a real dom.
class Reconciler {
  constructor(doc, events) {
    this.doc = doc;
    this.events = events;
    this.active = null;
    this.autoFocus = null;
  }

  reconcile(root, before, after) {
    this.autoFocus = null;
    const active = this.doc.activeElement;
    if (active !== this.doc.body) this.active = active;
    try {
      return this.updateChildren(root, before, after);
    } finally {
      const elt = this.autoFocus || this.active;
      if (elt && elt.focus && this.doc.activeElement === this.doc.body)
        elt.focus();
    }
  }

  // updateChildren returns updated spec;
  updateChildren(elt, before, after) {
    // create a map of key => {node, spec} for existing nodes
    const beforeMap = this._toSpecMap(elt, before);

    // create childNodes reusing old nodes from beforeMap
    after = latest(after);
    const childNodes = [];
    const spec = Specs.mapChild("", after, (key, spec) => {
      const wasActive = (beforeMap[key] || {}).node === this.active;
      const result = this.updateNode(beforeMap, key, spec);
      childNodes.push(result.node);
      if (wasActive) this.active = result.node;
      return result.spec;
    });

    // delete old nodes
    for (let key in beforeMap) {
      const node = beforeMap[key].node;
      node.parentNode.removeChild(node);
      if (node === this.active) this.active = null;
    }

    // replace children collection
    this._replaceChildNodes(elt, childNodes);

    // return updated spec
    return spec;
  }

  // updateNode may modify the node & spec. returns {node, spec}
  updateNode(beforeMap, key, spec) {
    let b = beforeMap[key];
    if (!b || b.spec.tag !== spec.tag) {
      if (!isText(spec) && !isHTML(spec)) {
        const node = this.doc.createElement(spec.tag);
        if (spec.props.hasOwnProperty("autofocus")) {
          this.autoFocus = node;
        }
        const before = { tag: spec.tag, props: {}, contents: {} };
        return this._updateNonTextNode(node, before, spec);
      }

      if (isText(spec)) {
        return { spec, node: this.doc.createTextNode(spec.text) };
      }
      return { spec, node: this._createHTMLNode(spec.htmlUnsafe) };
    }

    delete beforeMap[key];

    const { node, spec: before } = b;
    if (isText(spec)) {
      node.nodeValue = spec.text;
      return { node, spec };
    }
    if (isHTML(spec)) {
      if (spec.htmlUnsafe === before.htmlUnsafe) {
        return { node, spec };
      }
      return { spec, node: this._createHTMLNode(spec.htmlUnsafe) };
    }

    return this._updateNonTextNode(node, before, spec);
  }

  _createHTMLNode(html) {
    const n = this.doc.createElement("div");
    n.innerHTML = html;
    return n.firstChild || n;
  }

  _updateNonTextNode(node, before, after) {
    const props = latest(after.props);
    Props.update(node, before.props, props);

    this.events.update(node, before.events || {}, after.events || {});

    const c = this.updateChildren(node, before.contents, after.contents);
    if (c !== after.contents || props != after.props) {
      after = Object.assign({}, after, { props, contents: c });
    }

    return { node, spec: after };
  }

  // iterate through a spec and create a map of key => {spec, node}
  _toSpecMap(elt, spec) {
    const result = {};
    let child = elt.firstChild;
    Specs.forEachChild("", spec, (key, spec) => {
      result[key] = { node: child, spec };
      child = child.nextSibling;
    });
    return result;
  }

  // update child nodes of an elt to match provided nodes
  _replaceChildNodes(elt, childNodes) {
    // check if childNodes are even different
    let idx = 0;
    let child = elt.firstChild;
    while (child && childNodes.length > 0 && childNodes[idx] === child) {
      child = child.nextSibling;
      idx++;
    }
    if (idx === childNodes.length && !child) return;

    if (elt.append) elt.append.apply(elt, childNodes);
    else childNodes.map(child => elt.appendChild(child));

    // The following is a special hack where chrome seems to add a
    // text node sometimes.
    while (elt.firstChild !== null && elt.firstChild !== childNodes[0]) {
      elt.removeChild(elt.firstChild);
      if (elt === this.active) this.active = null;
    }
  }
}

// Specs implements iterators over vdom node framgents (which can be
// single nodes or an array or {nodes: array}.
class Specs {
  // forEachChild calls fn(key, spec) for each vdom node it finds
  static forEachChild(prefix, spec, fn) {
    if (!spec) return;
    if (Array.isArray(spec)) {
      return this.forEachChild(prefix, { nodes: spec }, fn);
    }
    const specKey = spec.key || "";
    const key = prefix + "." + specKey;

    if (isText(spec) || isHTML(spec) || spec.tag) return fn(key, spec);
    if (!spec.nodes) return;

    for (let kk = 0; kk < spec.nodes.length; kk++) {
      const pre = spec.nodes[kk].key ? key : key + kk;
      this.forEachChild(pre, spec.nodes[kk], fn);
    }
  }

  // mapChild is like forEachChild except, it calls fn(key, spec) for
  // each vdom spec it finds but in addition, it expect the fn to
  // return an updated spec. It uses this to return an updated spec
  // for the current collection.
  static mapChild(prefix, spec, fn) {
    if (!spec) return;
    spec = latest(spec);

    if (Array.isArray(spec)) {
      return this.mapChild(prefix, { nodes: spec }, fn);
    }
    const specKey = spec.key || "";
    const key = prefix + "." + specKey;

    if (isText(spec) || isHTML(spec) || spec.tag) return fn(key, spec);
    if (!spec.nodes) return spec;

    let specs = null;
    for (let kk = 0; kk < spec.nodes.length; kk++) {
      const pre = spec.nodes[kk].key ? key : key + kk;
      const updated = this.mapChild(pre, spec.nodes[kk], fn);
      if (updated === spec.nodes[kk]) continue;
      if (!specs) specs = spec.nodes.slice();
      specs[kk] = updated;
    }

    if (!specs) return spec;
    return Object.assign({}, spec, { nodes: specs });
  }
}

// Props manages updating props (both properties and attributes).
class Props {
  static update(elt, before, after) {
    for (let key in before) {
      if (!after.hasOwnProperty(key)) {
        this._removeProp(elt, key);
      }
    }

    for (let key in after) {
      if (after[key] === before[key]) continue;
      this._addProp(elt, key, after[key]);
    }
  }

  static _addProp(elt, key, value) {
    const a = this._attribute(key),
      p = this._property(key);
    if (p) elt[p] = value;
    if (a) elt.setAttribute(a, value);
  }

  static _removeProp(elt, key) {
    const a = this._attribute(key),
      p = this._property(key);
    if (p) elt[p] = false;
    if (a) elt.removeAttribute(a);
  }

  static _property(key) {
    return key === "value" || key === "checked" ? key : "";
  }

  static _attribute(key) {
    return key === "value" ? "" : key;
  }
}
