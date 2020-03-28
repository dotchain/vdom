const { JSDOM } = require("jsdom");
const simulant = require("jsdom-simulant");

class FakeStorage {
  constructor() {
    this.items = {};
  }

  setItem(key, value) {
    this.items[key] = value;
  }

  getItem(key) {
    return this.items[key];
  }
}

/**
 *  * Create a JSDOM window object for test cases.
 *   */
function createWindow(optBody, optOptions) {
  const opts = Object.assign({ features: { QuerySelector: true } }, optOptions);
  const dom = new JSDOM(optBody || "<html><body></body></html>", opts);
  const win = dom.window;

  // Create a simple stub for requestAnimationFrame
  win.requestAnimationFrame = setTimeout.bind(global);

  /* eslint-disable no-param-reassign */
  win.localStorage = new FakeStorage();
  /* eslint-enable no-param-reassign */

  win.onerror = (messageOrEvent, source, lineno, colno, error) => {
    console.error(
      "test_helper.js createWindow() encountered an uncaught exception. This is likely caused by a thrown exception in an application event handler."
    );
    console.error(error);
  };

  /**
   * Set the current URL on the provided window.location object.
   *
   * NOTE(lbayes): Partial implementation by okovpashko, found on Github issue here:
   * https://github.com/facebook/jest/issues/890#issuecomment-298594389
   * Original implementation did not handle search or hash values properly.
   */
  win.setUrl = urlOrPart => {
    const url =
      urlOrPart.indexOf("http") === 0
        ? urlOrPart
        : ["http://example.com", urlOrPart.replace(/^\//, "")].join("/");
    const parser = win.document.createElement("a");
    parser.href = url;
    [
      "href",
      "protocol",
      "host",
      "hostname",
      "origin",
      "port",
      "pathname"
    ].forEach(prop => {
      Object.defineProperty(win.location, prop, {
        value: parser[prop],
        writable: true
      });
    });

    const parts = url.split("?");
    const search = parts.length > 1 ? `?${parts[1]}` : "";

    Object.defineProperty(win.location, "search", {
      value: search,
      writable: true
    });

    const hash = url.split("#");
    Object.defineProperty(win.location, "hash", {
      value: hash.length > 1 ? `#${hash[1]}` : "",
      writable: true
    });
  };

  return win;
}

/**
 * Create a JSDOM window object and return the related document.
 */
function createDocument(optOptions) {
  return createWindow(optOptions).document;
}

module.exports = {
  FakeStorage,
  createDocument,
  createWindow,
  fire: simulant.fire
};
