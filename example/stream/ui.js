"use strict";

exports.stream = {
  text,
  form,
  checkbox,
  button,
  label,
  h1,
  section,
  textEdit,
  textLive,
  conditionalTextEdit
};
exports.action = { replace, handle };
exports.kbd = { onEnter, onEscape };

exports.withClass = withClass;
exports.withPlaceholder = withPlaceholder;
exports.withAutofocus = withAutofocus;
exports.withId = withId;
exports.withEvents = withEvents;

function label(s, labelFor) {
  const props = { for: labelFor };
  return { tag: "label", props, contents: { text: s.valueOf() } };
}

function h1(s) {
  return { tag: "h1", props: {}, contents: { text: s.valueOf() } };
}

function section(contents) {
  return { tag: "section", props: {}, contents };
}

function conditionalTextEdit(s, editing) {
  if (!editing.valueOf()) return {};
  const endEdit = replace(editing, null);
  const e = textEdit(s, [replace(s), endEdit], endEdit, endEdit);
  return withAutofocus(e);
}

function textLive(s, enter, blur, escape) {
  const events = { keyup: [replace(s)] };
  if (blur) events.blur = blur;
  if (enter) events.keyup.push(onEnter(enter));
  if (escape) events.keyup.push(onEscape(escape));
  return text(s, events);
}

function textEdit(s, enter, blur, escape) {
  const events = { keyup: [] };
  if (blur) events.blur = blur;
  if (enter) events.keyup.push(onEnter(enter));
  if (escape) events.keyup.push(onEscape(escape));
  return text(s, events);
}

function text(s, events) {
  events = events || { keyup: replace(s) };
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
  if (!spec || !spec.props) return spec;

  className = className.valueOf();
  if (Array.isArray(className)) {
    spec.props["class"] = className.join(" ");
  } else if (typeof className == "object") {
    const o = [];
    for (let key in className) {
      if ((className[key] || false).valueOf()) o.push(key);
    }
    spec.props["class"] = o.join(" ");
  } else {
    spec.props["class"] = className;
  }
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

function withEvents(events, spec) {
  spec.events = events || {};
  for (let key in events) {
    spec.events[key] = events[key];
  }
  return spec;
}

// Actions

function replace(stream, value) {
  if (arguments.length === 1) return { replace: stream.ref() };

  if (!value || typeof value !== "object") {
    // TODO: fix this hacky way to check for basic type
    return { replace: stream.ref(), value };
  }

  if (value.ref) {
    return { replace: stream.ref(), valueref: value.ref() };
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

function onEnter(action) {
  return { onKey: action, key: "Enter" };
}

function onEscape(action) {
  return { onKey: action, key: "Escape" };
}

function handle(data, state, e, action) {
  if (Array.isArray(action)) {
    action.map(a => handle(data, state, e, a));
    return;
  }
  if (e.type.startsWith("key") && action.hasOwnProperty("onKey")) {
    if (action.key !== e.key) return;
    return handle(data, state, e, action.onKey);
  }
  const resolve = path => {
    if (path[0] === "state") {
      return resolvePath(state.latest(), path.slice(1));
    }
    return resolvePath(data.latest(), path);
  };

  const value = actionValue(e, action, resolve);
  const path = action.replace;
  for (let key in action.streams || {}) {
    value[key] = resolve(action.streams[key]);
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
  if (action.hasOwnProperty("valueref")) return resolve(action.valueref);
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
