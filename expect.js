/* eslint-env mocha, browser */

exports.expect = function expect(v) {
  function assert(isEqual, other) {
    if (!isEqual) {
      const got = JSON.stringify(v);
      const want = JSON.stringify(other);
      throw new Error("expected " + got + " to equal " + want);
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

    for (let key in other) {
      if (other.hasOwnProperty(key)) {
        expect(v.hasOwnProperty(key)).to.equal(true);
      }
    }
  }
  return { to: { equal: equal, deep: { equal: deepEqual } } };
};
