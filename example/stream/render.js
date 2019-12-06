"use strict";

const uuidv4 = require("uuid/v4");
const ui = require("./ui.js");
const streams = require("streams/es6");

exports.app = app;

// render a single todo
function todo(id, data, state) {
  const deleteAction = ui.action.replace(data.deleted, true);
  const c = data.completed.valueOf() ? "completed" : "";
  return ui.withClass(c, {
    tag: "li",
    key: id,
    props: {},
    contents: [
      {
        tag: "div",
        props: { class: "view" },
        contents: [
          ui.withClass("toggle", ui.stream.checkbox(data.completed)),
          ui.stream.label(data.description),
          ui.withClass("destroy", ui.stream.button("", deleteAction))
        ]
      },
      ui.withClass("edit", ui.stream.text(data.description))
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

  return ui.withClass("header", {
    tag: "header",
    props: {},
    contents: [
      ui.stream.h1("todos"),
      ui.stream.form(
        [appendAction, clearInputAction],
        ui.withClass("new-todo", ph(af(ui.stream.text(desc))))
      )
    ]
  });
}

// render the button to the left of the `new todo` input which toggles
// all todos to be `incomplete` or `complete`
function toggleAll(data, state) {
  const checked = incompleteCount(data) !== 0;
  const events = { click: { setAll: checked } };
  const idclass = (id, spec) => ui.withId(id, ui.withClass(id, spec))
  
  return [
    idclass('toggle-all', ui.stream.checkbox(checked, events)),
    ui.stream.label("Mark all as complete", "toggle-all")
  ];
}

// render the list of todos
function todos(data, state) {
  const matches = (filter, todo) => {
    const completed = todo.completed.valueOf();
    return filter === "" || (filter == "completed") === completed;
  };

  const ids = [];
  data.forEachKey(key => {
    if (
      !data[key].deleted.valueOf() &&
      matches(state.filter.valueOf(), data[key])
    ) {
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
function filterButton(text, href, selected) {
  const link = { tag: "a", props: { href }, contents: { text } };
  return {
    tag: "li",
    props: {},
    contents: ui.withClass(selected ? "selected" : "", link)
  };
}

// render the filter options
function filters(data, state) {
  const filter = state.filter.valueOf();

  return {
    tag: "ul",
    props: { class: "filters" },
    contents: [
      filterButton("All", "#", filter == ""),
      filterButton("Active", "#/active", filter == "active"),
      filterButton("Completed", "#/completed", filter == "completed")
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
