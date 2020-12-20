self.uhooksDOM = (function (exports) {
  'use strict';

  /*! (c) Andrea Giammarchi - ISC */
  var self = {};
  self.CustomEvent = typeof CustomEvent === 'function' ? CustomEvent : function (__p__) {
    CustomEvent[__p__] = new CustomEvent('').constructor[__p__];
    return CustomEvent;

    function CustomEvent(type, init) {
      if (!init) init = {};
      var e = document.createEvent('CustomEvent');
      e.initCustomEvent(type, !!init.bubbles, !!init.cancelable, init.detail);
      return e;
    }
  }('prototype');
  var CustomEvent$1 = self.CustomEvent;

  /**
   * @typedef {Object} Handler an object that handle events.
   * @property {(event: Event) => void} connected an optional method triggered when node is connected.
   * @property {(event: Event) => void} disconnected an optional method triggered when node is disconnected.
   */

  /**
   * @typedef {Object} UConnect an utility to connect or disconnect nodes to observe.
   * @property {(node: Node, handler?: Handler) => void} connect a method to start observing a generic Node.
   * @property {(node: Node) => void} disconnect a method to stop observing a generic Node.
   * @property {() => void} kill a method to kill/disconnect the MutationObserver.
   */

  /**
   * Attach a MutationObserver to a generic node and returns a UConnect instance.
   * @param {Node} root a DOM node to observe for mutations.
   * @param {string} parse the kind of nodes to parse: children, by default, or childNodes.
   * @param {Event} CE an Event/CustomEvent constructor (polyfilled in SSR).
   * @param {MutationObserver} MO a MutationObserver constructor (polyfilled in SSR).
   * @returns {UConnect} an utility to connect or disconnect nodes to observe.
   */
  var observe = function observe(root, parse, CE, MO) {
    var observed = new WeakMap(); // these two should be WeakSet but IE11 happens

    var wmin = new WeakMap();
    var wmout = new WeakMap();

    var has = function has(node) {
      return observed.has(node);
    };

    var disconnect = function disconnect(node) {
      if (has(node)) {
        listener(node, node.removeEventListener, observed.get(node));
        observed["delete"](node);
      }
    };

    var connect = function connect(node, handler) {
      disconnect(node);
      if (!(handler || (handler = {})).handleEvent) handler.handleEvent = handleEvent;
      listener(node, node.addEventListener, handler);
      observed.set(node, handler);
    };

    var listener = function listener(node, method, handler) {
      method.call(node, 'disconnected', handler);
      method.call(node, 'connected', handler);
    };

    var notifyObserved = function notifyObserved(nodes, type, wmin, wmout) {
      for (var length = nodes.length, i = 0; i < length; i++) {
        notifyTarget(nodes[i], type, wmin, wmout);
      }
    };

    var notifyTarget = function notifyTarget(node, type, wmin, wmout) {
      if (has(node) && !wmin.has(node)) {
        wmout["delete"](node);
        wmin.set(node, 0);
        node.dispatchEvent(new (CE || CustomEvent)(type));
      }

      notifyObserved(node[parse || 'children'] || [], type, wmin, wmout);
    };

    var mo = new (MO || MutationObserver)(function (nodes) {
      for (var length = nodes.length, i = 0; i < length; i++) {
        var _nodes$i = nodes[i],
            removedNodes = _nodes$i.removedNodes,
            addedNodes = _nodes$i.addedNodes;
        notifyObserved(removedNodes, 'disconnected', wmout, wmin);
        notifyObserved(addedNodes, 'connected', wmin, wmout);
      }
    });
    mo.observe(root || document, {
      subtree: true,
      childList: true
    });
    return {
      has: has,
      connect: connect,
      disconnect: disconnect,
      kill: function kill() {
        mo.disconnect();
      }
    };
  };

  function handleEvent(event) {
    if (event.type in this) this[event.type](event);
  }

  var Lie = typeof Promise === 'function' ? Promise : function (fn) {
    var queue = [],
        resolved = 0,
        value;
    fn(function ($) {
      value = $;
      resolved = 1;
      queue.splice(0).forEach(then);
    });
    return {
      then: then
    };

    function then(fn) {
      return resolved ? setTimeout(fn, 0, value) : queue.push(fn), this;
    }
  };

  var h = null,
      schedule = new Set();
  var hooks = new WeakMap();

  var invoke = function invoke(effect) {
    var $ = effect.$,
        r = effect.r,
        h = effect.h;

    if (isFunction(r)) {
      fx.get(h)["delete"](effect);
      r();
    }

    if (isFunction(effect.r = $())) fx.get(h).add(effect);
  };

  var runSchedule = function runSchedule() {
    var previous = schedule;
    schedule = new Set();
    previous.forEach(update);
  };

  var fx = new WeakMap();
  var effects = [];
  var layoutEffects = [];
  function different(value, i) {
    return value !== this[i];
  }
  var dropEffect = function dropEffect(hook) {
    var effects = fx.get(hook);
    if (effects) wait.then(function () {
      effects.forEach(function (effect) {
        effect.r();
        effect.r = null;
      });
      effects.clear();
    });
  };
  var getInfo = function getInfo() {
    return hooks.get(h);
  };
  var hasEffect = function hasEffect(hook) {
    return fx.has(hook);
  };
  var isFunction = function isFunction(f) {
    return typeof f === 'function';
  };
  var hooked = function hooked(callback) {
    var info = {
      h: hook,
      c: null,
      a: null,
      e: 0,
      i: 0,
      s: []
    };
    hooks.set(hook, info);
    return hook;

    function hook() {
      var p = h;
      h = hook;
      info.e = info.i = 0;

      try {
        return callback.apply(info.c = this, info.a = arguments);
      } finally {
        h = p;
        if (effects.length) wait.then(effects.forEach.bind(effects.splice(0), invoke));
        if (layoutEffects.length) layoutEffects.splice(0).forEach(invoke);
      }
    }
  };
  var reschedule = function reschedule(info) {
    if (!schedule.has(info)) {
      info.e = 1;
      schedule.add(info);
      wait.then(runSchedule);
    }
  };
  var update = function update(_ref) {
    var h = _ref.h,
        c = _ref.c,
        a = _ref.a,
        e = _ref.e;
    // avoid running schedules when the hook is
    // re-executed before such schedule happens
    if (e) h.apply(c, a);
  };
  var wait = new Lie(function ($) {
    return $();
  });

  var createContext = function createContext(value) {
    return {
      _: new Set(),
      provide: provide,
      value: value
    };
  };
  var useContext = function useContext(_ref) {
    var _ = _ref._,
        value = _ref.value;

    _.add(getInfo());

    return value;
  };

  function provide(newValue) {
    var _ = this._,
        value = this.value;

    if (value !== newValue) {
      this._ = new Set();
      this.value = newValue;

      _.forEach(update);
    }
  }

  var useCallback = function useCallback(fn, guards) {
    return useMemo(function () {
      return fn;
    }, guards);
  };
  var useMemo = function useMemo(memo, guards) {
    var info = getInfo();
    var i = info.i,
        s = info.s;
    if (i === s.length || !guards || guards.some(different, s[i]._)) s[i] = {
      $: memo(),
      _: guards
    };
    return s[info.i++].$;
  };

  var createEffect = function createEffect(stack) {
    return function (callback, guards) {
      var info = getInfo();
      var i = info.i,
          s = info.s,
          h = info.h;
      var call = i === s.length;

      if (call) {
        if (!fx.has(h)) fx.set(h, new Set());
        s.push({
          $: callback,
          _: guards,
          r: null,
          h: h
        });
      }

      var effect = s[info.i++];
      if (call || !guards || guards.some(different, effect._)) stack.push(effect);
    };
  };

  var useEffect = createEffect(effects);
  var useLayoutEffect = createEffect(layoutEffects);

  var getValue = function getValue(value, f) {
    return isFunction(f) ? f(value) : f;
  };

  var useReducer = function useReducer(reducer, value, init) {
    var info = getInfo();
    var i = info.i,
        s = info.s;
    if (i === s.length) s.push({
      $: isFunction(init) ? init(value) : getValue(void 0, value),
      set: function set(value) {
        s[i].$ = reducer(s[i].$, value);
        reschedule(info);
      }
    });
    var _s$info$i = s[info.i++],
        $ = _s$info$i.$,
        set = _s$info$i.set;
    return [$, set];
  };
  var useState = function useState(value) {
    return useReducer(getValue, value);
  };

  var useRef = function useRef(current) {
    var info = getInfo();
    var i = info.i,
        s = info.s;
    if (i === s.length) s.push({
      current: current
    });
    return s[info.i++];
  };

  /*! (c) Andrea Giammarchi - ISC */
  var h$1 = null,
      c = null,
      a = null;
  var fx$1 = new WeakMap();

  var wrap = function wrap(h, c, a, reduced) {
    return h ? [reduced[0], function (value) {
      if (!fx$1.has(h)) {
        fx$1.set(h, 0);
        wait.then(function () {
          fx$1["delete"](h);
          h.apply(c, a);
        });
      }

      reduced[1](value);
    }] : reduced;
  };

  var hooked$1 = function hooked$1(callback, outer) {
    return hooked(outer ? function hook() {
      var ph = h$1,
          pc = c,
          pa = a;
      h$1 = hook;
      c = this;
      a = arguments;

      try {
        return callback.apply(c, a);
      } finally {
        h$1 = ph;
        c = pc;
        a = pa;
      }
    } : callback);
  };
  var useReducer$1 = function useReducer$1(reducer, value, init) {
    return wrap(h$1, c, a, useReducer(reducer, value, init));
  };
  var useState$1 = function useState$1(value) {
    return wrap(h$1, c, a, useState(value));
  };

  /*! (c) Andrea Giammarchi - ISC */
  var observer = null;

  var find = function find(_ref) {
    var firstChild = _ref.firstChild;
    if (firstChild && firstChild.nodeType !== 1 && !(firstChild = firstChild.nextElementSibling)) throw 'unobservable';
    return firstChild;
  };

  var get = function get(node) {
    var nodeType = node.nodeType;
    if (nodeType) return nodeType === 1 ? node : find(node);else {
      // give a chance to facades to return a reasonable value
      var value = node.valueOf();
      return value !== node ? get(value) : find(value);
    }
  };

  var hooked$2 = function hooked(fn, outer) {
    var hook = hooked$1(fn, outer);
    return function () {
      var node = hook.apply(this, arguments);

      if (hasEffect(hook)) {
        var element = get(node);
        if (!observer) observer = observe(element.ownerDocument, 'children', CustomEvent$1);
        if (!observer.has(element)) observer.connect(element, {
          disconnected: function disconnected() {
            dropEffect(hook);
          }
        });
      }

      return node;
    };
  };

  exports.createContext = createContext;
  exports.hooked = hooked$2;
  exports.useCallback = useCallback;
  exports.useContext = useContext;
  exports.useEffect = useEffect;
  exports.useLayoutEffect = useLayoutEffect;
  exports.useMemo = useMemo;
  exports.useReducer = useReducer$1;
  exports.useRef = useRef;
  exports.useState = useState$1;
  exports.wait = wait;

  

  return exports;

}({}));
