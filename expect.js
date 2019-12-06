/* eslint-env mocha, browser */

exports.expect = expect;

function expect(v) {
  function assert(isEqual, other) {
    if (!isEqual) {
      throw new Error(
        "expected " + JSON.stringify(v) + " to equal " + JSON.stringify(other)
      );
    }
  }
  function equal(other) {
    assert(v === other, other);
  }
  function deepEqual(other) {
    if (v === other) {
      return;
    }
    assert(!v === !other);
    if (typeof v !== "object" || v === null) {
      assert(false, other);
    }

    assert(typeof other === "object" && other !== null, other);
    for (let key in v) {
      if (v.hasOwnProperty(key)) {
        expect(v[key]).to.deep.equal(other[key]);
      }
    }
  }
  return { to: { equal: equal, deep: { equal: deepEqual } } };
}
