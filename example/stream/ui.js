"use strict";

exports.stream = { text, form, checkbox, button, label, h1, section };
exports.action = { replace, handle };

exports.withClass = withClass;
exports.withPlaceholder = withPlaceholder;
exports.withAutofocus = withAutofocus;
exports.withId = withId;

function label(s, labelFor) {
  const props = {'for': labelFor};
  return { tag: "label", props, contents: { text: s.valueOf() } };
}

function h1(s) {
  return { tag: "h1", props: {}, contents: { text: s.valueOf() } };
}

function section(contents) {
  return { tag: "section", props: {}, contents };
}

function text(s) {
  const events = { keyup: replace(s) };
  const props = { type: "text", value: s.valueOf() || "" };
  return { tag: "input", props, events, contents: {} };
}

function form(action, contents) {
  const props = { action: "#" };
  const events = { submit: action };
  return { tag: "form", props, events, contents };
}

function checkbox(checked, events) {
  events = events || { change: { replace: checked.ref() } };
  const props = { type: "checkbox" };
  if (checked.valueOf()) props.checked = true;
  return { tag: "input", props, events, contents: {} };
}

function button(label, action) {
  const events = { click: action };
  return { tag: "button", props: {}, events, contents: { text: label } };
}

function withClass(className, spec) {
  spec.props["class"] = className;
  return spec;
}

function withPlaceholder(placeholder, spec) {
  spec.props["placeholder"] = placeholder;
  return spec;
}

function withAutofocus(spec) {
  spec.props["autofocus"] = "";
  return spec;
}

function withId(id, spec) {
  spec.props.id = id;
  return spec;
}

// Actions

function replace(stream, value) {
  if (arguments.length === 1) return { replace: stream.ref() };

  if (typeof value !== "object") {
    // TODO: fix this hacky way to check for basic type
    return { replace: stream.ref(), value };
  }

  const action = { replace: stream.ref(), value: {} };
  let streams = null;
  for (let key in value) {
    const v = value[key];
    if (v && typeof v.ref === "function") {
      streams = streams || {};
      streams[key] = v.ref();
    } else {
      action.value[key] = v;
    }
  }
  if (streams) action.streams = streams;
  return action;
}

function handle(data, state, e, action) {
  e.preventDefault();
  if (Array.isArray(action)) {
    action.map(a => handle(data, state, e, a));
    return;
  }
  const value = actionValue(e, action);
  const path = action.replace;
  for (let key in action.streams || {}) {
    const path = action.streams[key];
    if (path[0] === "state") {
      value[key] = resolvePath(state.latest(), path.slice(1));
    } else {
      value[key] = resolvePath(data.latest(), path);
    }
  }
  replacePath(data, state, path, value);
}

function resolvePath(stream, path) {
  for (let kk = 0; kk < path.length; kk++) {
    stream = stream.get(path[kk]);
  }
  return stream.valueOf();
}

function actionValue(e, action) {
  if (action.hasOwnProperty("value")) return action.value;
  if (e.target.type === "checkbox") return e.target.checked;
  return e.target.value;
}

function replacePath(data, state, path, value) {
  if (path.length > 0 && path[0] === "state") {
    state.latest().replacePath(path.slice(1), value);
  } else {
    data.latest().replacePath(path, value);
  }
}
