/*! (c) Andrea Giammarchi - ISC */

import {observe} from 'uconnect';
const observer = observe(document, 'children', CustomEvent);

import {hooked as $hooked, dropEffect, hasEffect} from 'uhooks-fx';

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

export const hooked = (fn, outer) => {
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

export {
  wait,
  createContext, useContext,
  useCallback, useMemo,
  useEffect, useLayoutEffect,
  useReducer, useState, useRef
} from 'uhooks-fx';
