'use strict';
/*! (c) Andrea Giammarchi - ISC */

const {observe} = require('uconnect');
const observer = observe(document, 'children', CustomEvent);

const {hooked: $hooked, dropEffect, hasEffect} = require('uhooks-fx');

const find = ({firstChild}) => {
  if (
    firstChild &&
    firstChild.nodeType !== 1 &&
    !(firstChild = firstChild.nextElementSibling)
  )
    throw 'unobservable';
  return firstChild;
};

const get = node => {
  const {nodeType} = node;
  if (nodeType)
    return nodeType === 1 ? node : find(node);
  else {
    // give a chance to facades to return a reasonable value
    const value = node.valueOf();
    return value !== node ? get(value) : find(value);
  }
};

const hooked = (fn, outer) => {
  const hook = $hooked(fn, outer);
  return /*async*/ function () {
    const node = /*await*/ hook.apply(this, arguments);
    if (hasEffect(hook)) {
      const element = get(node);
      if (!observer.has(element))
        observer.connect(element, {
          disconnected() {
            dropEffect(hook);
          }
        });
    }
    return node;
  };
};
exports.hooked = hooked;

(m => {
  exports.wait = m.wait;
  exports.createContext = m.createContext;
  exports.useContext = m.useContext;
  exports.useCallback = m.useCallback;
  exports.useMemo = m.useMemo;
  exports.useEffect = m.useEffect;
  exports.useLayoutEffect = m.useLayoutEffect;
  exports.useReducer = m.useReducer;
  exports.useState = m.useState;
  exports.useRef = m.useRef;
})(require('uhooks-fx'));
