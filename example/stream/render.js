"use strict";

const uuidv4 = require("uuid/v4");
const ui = require("./ui.js");
const streams = require("streams/es6");

exports.app = app;

// render a single todo
function todo(id, data, state) {
  const editing = state.get(id).get("editing");
  const deleteAction = ui.action.replace(data.deleted, true);
  const labelEvents = { dblclick: ui.action.replace(editing, true) };
  const classes = { completed: data.completed, editing };
  return ui.withClass(classes, {
    tag: "li",
    key: id,
    props: {},
    contents: [
      {
        tag: "div",
        props: { class: "view" },
        contents: [
          ui.withClass("toggle", ui.stream.checkbox(data.completed)),
          ui.withEvents(labelEvents, ui.stream.label(data.description)),
          ui.withClass("destroy", ui.stream.button("", deleteAction))
        ]
      },
      ui.withClass(
        "edit",
        ui.stream.conditionalTextEdit(data.description, editing)
      )
    ]
  });
}

// render the top text input for new todos
function newTodo(data, state) {
  const desc = state.get("description");

  const af = spec => ui.withAutofocus(spec);
  const ph = spec => ui.withPlaceholder("What needs to be done?", spec);

  // append is done by creating a new ID using uuidv4 and replacing
  // its value (no existing value is treated as null) to a template.
  // the template itself has a field which is a stream pointing into
  // the state. This works because ui.action.replace replaces streams
  // with references to the stream path and then in ui.stream.handle,
  // these are again patched up.
  const appendAction = ui.action.replace(data.get(uuidv4()), {
    description: desc,
    completed: false,
    deleted: false
  });
  // clear input action clears the input box
  const clearInputAction = ui.action.replace(desc, "");

  const enter = [ui.action.replace(desc), appendAction, clearInputAction];
  const blur = null;
  const escape = [clearInputAction];
  return ui.withClass("header", {
    tag: "header",
    props: {},
    contents: [
      ui.stream.h1("todos"),
      ui.withClass(
        "new-todo",
        ph(af(ui.stream.textLive(desc, enter, blur, escape)))
      )
    ]
  });
}

// render the button to the left of the `new todo` input which toggles
// all todos to be `incomplete` or `complete`
function toggleAll(data, state) {
  const checked = incompleteCount(data) !== 0;
  const events = { click: { setAll: checked } };
  const idclass = (id, spec) => ui.withId(id, ui.withClass(id, spec));

  return [
    idclass("toggle-all", ui.stream.checkbox(checked, events)),
    ui.stream.label("Mark all as complete", "toggle-all")
  ];
}

// render the list of todos
function todos(data, state) {
  const matches = todo => {
    const deleted = todo.deleted.valueOf();
    const completed = todo.completed.valueOf();
    switch (state.location.hash.valueOf()) {
      case "#/active":
        return !deleted && !completed;
      case "#/completed":
        return !deleted && completed;
    }
    return !deleted;
  };

  const ids = [];
  data.forEachKey(key => {
    if (matches(data[key])) {
      ids.push(key);
    }
  });
  ids.sort();

  return {
    tag: "ul",
    props: { class: "todo-list" },
    contents: ids.map(id => todo(id, data[id], state))
  };
}

// count the number of non-deleted todos
function nonDeletedCount(data) {
  let count = 0;
  data.forEachKey(key => {
    if (!data[key].deleted.valueOf()) count++;
  });
  return count;
}

// count the number of incomplete todos
function incompleteCount(data) {
  let count = 0;
  data.forEachKey(key => {
    if (!data[key].deleted.valueOf() && !data[key].completed.valueOf()) {
      count++;
    }
  });
  return count;
}

// render the item count
function itemCount(data, state) {
  const count = nonDeletedCount(data).toString();
  return [
    { tag: "strong", props: {}, contents: { text: count } },
    { text: " items left" }
  ];
}

// render one of the filter options
function filterButton(text, expectedHash, hash) {
  const hashv = hash.valueOf();
  if (hashv !== "#/active" || hashv !== "#/completed") {
    hashv == "#/";
  }
  const events = { click: ui.action.replace(hash, expectedHash) };
  return {
    tag: "li",
    props: {},
    contents: ui.withClass(
      { selected: hashv === expectedHash },
      { tag: "a", props: {}, events, contents: { text } }
    )
  };
}

// render the filter options
function filters(data, state) {
  return {
    tag: "ul",
    props: { class: "filters" },
    contents: [
      filterButton("All", "#/", state.location.hash),
      filterButton("Active", "#/active", state.location.hash),
      filterButton("Completed", "#/completed", state.location.hash)
    ]
  };
}

// render the 'Clear Completed' button
function clearCompletedButton(data, sate) {
  let completed = false;
  data.forEachKey(id => {
    const v = data[id];
    completed = completed || (v.completed.valueOf() && !v.deleted.valueOf());
  });

  if (!completed) return {};

  // clear_completed action is implemented in the main App
  return ui.withClass(
    "clear-completed",
    ui.stream.button("Clear completed", "clear_completed")
  );
}

// render the footer to the list of todos
function footer(data, state) {
  return {
    tag: "footer",
    props: { class: "footer" },
    contents: [
      {
        tag: "span",
        props: { class: "todo-count" },
        contents: itemCount(data)
      },
      filters(data, state),
      clearCompletedButton(data, state)
    ]
  };
}

// render the app
function app(data, state) {
  if (nonDeletedCount(data.todos) === 0) {
    return ui.withClass(
      "todoapp",
      ui.stream.section([newTodo(data.todos, state.get("addTodo"))])
    );
  }

  return ui.withClass(
    "todoapp",
    ui.stream.section([
      newTodo(data.todos, state.get("addTodo")),
      ui.withClass(
        "main",
        ui.stream.section([
          toggleAll(data.todos, state),
          todos(data.todos, state)
        ])
      ),
      footer(data.todos, state)
    ])
  );
}
