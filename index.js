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
    mo.add = add;
    mo.add(root || document);
    var attachShadow = Element.prototype.attachShadow;
    if (attachShadow) Element.prototype.attachShadow = function (init) {
      var sd = attachShadow.call(this, init);
      mo.add(sd);
      return sd;
    };
    return {
      has: has,
      connect: connect,
      disconnect: disconnect,
      kill: function kill() {
        mo.disconnect();
      }
    };
  };

  function add(node) {
    this.observe(node, {
      subtree: true,
      childList: true
    });
  }

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

  var info = null,
      schedule = new Set();

  var invoke = function invoke(effect) {
    var $ = effect.$,
        r = effect.r,
        h = effect.h;

    if (isFunction(r)) {
      fx$1.get(h)["delete"](effect);
      r();
    }

    if (isFunction(effect.r = $())) fx$1.get(h).add(effect);
  };

  var runSchedule = function runSchedule() {
    var previous = schedule;
    schedule = new Set();
    previous.forEach(function (_ref) {
      var h = _ref.h,
          c = _ref.c,
          a = _ref.a,
          e = _ref.e;
      // avoid running schedules when the hook is
      // re-executed before such schedule happens
      if (e) h.apply(c, a);
    });
  };

  var fx$1 = new WeakMap();
  var effects = [];
  var layoutEffects = [];
  function different(value, i) {
    return value !== this[i];
  }
  var dropEffect = function dropEffect(hook) {
    var effects = fx$1.get(hook);
    if (effects) wait.then(function () {
      effects.forEach(function (effect) {
        effect.r();
        effect.r = null;
      });
      effects.clear();
    });
  };
  var getInfo = function getInfo() {
    return info;
  };
  var hasEffect = function hasEffect(hook) {
    return fx$1.has(hook);
  };
  var isFunction = function isFunction(f) {
    return typeof f === 'function';
  };
  var hooked$2 = function hooked(callback) {
    var current = {
      h: hook,
      c: null,
      a: null,
      e: 0,
      i: 0,
      s: []
    };
    return hook;

    function hook() {
      var prev = info;
      info = current;
      current.e = current.i = 0;

      try {
        return callback.apply(current.c = this, current.a = arguments);
      } finally {
        info = prev;
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

      _.forEach(function (_ref2) {
        var h = _ref2.h,
            c = _ref2.c,
            a = _ref2.a;
        h.apply(c, a);
      });
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
      info.i++;

      if (call) {
        if (!fx$1.has(h)) fx$1.set(h, new Set());
        s[i] = {
          $: callback,
          _: guards,
          r: null,
          h: h
        };
      }

      if (call || !guards || guards.some(different, s[i]._)) stack.push(s[i]);
      s[i].$ = callback;
      s[i]._ = guards;
    };
  };

  var useEffect = createEffect(effects);
  var useLayoutEffect = createEffect(layoutEffects);

  var getValue = function getValue(value, f) {
    return isFunction(f) ? f(value) : f;
  };

  var useReducer$1 = function useReducer(reducer, value, init) {
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
  var useState$1 = function useState(value) {
    return useReducer$1(getValue, value);
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
  var h = null,
      c = null,
      a = null;
  var fx = new WeakMap();
  var states = new WeakMap();

  var set = function set(h, c, a, update) {
    var wrap = function wrap(value) {
      if (!fx.has(h)) {
        fx.set(h, 0);
        wait.then(function () {
          fx["delete"](h);
          h.apply(c, a);
        });
      }

      update(value);
    };

    states.set(update, wrap);
    return wrap;
  };

  var wrap = function wrap(h, c, a, state) {
    return h ? [state[0], states.get(state[1]) || set(h, c, a, state[1])] : state;
  };

  var hooked$1 = function hooked(callback, outer) {
    var hook = hooked$2(outer ?
    /*async*/
    function () {
      var ph = h,
          pc = c,
          pa = a;
      h = hook;
      c = this;
      a = arguments;

      try {
        return (
          /*await*/
          callback.apply(c, a)
        );
      } finally {
        h = ph;
        c = pc;
        a = pa;
      }
    } : callback);
    return hook;
  };
  var useReducer = function useReducer(reducer, value, init) {
    return wrap(h, c, a, useReducer$1(reducer, value, init));
  };
  var useState = function useState(value) {
    return wrap(h, c, a, useState$1(value));
  };

  /*! (c) Andrea Giammarchi - ISC */
  var observer = observe(document, 'children', CustomEvent$1);

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

  var hooked = function hooked(fn, outer) {
    var hook = hooked$1(fn, outer);
    return (
      /*async*/
      function () {
        var node =
        /*await*/
        hook.apply(this, arguments);

        if (hasEffect(hook)) {
          var element = get(node);
          if (!observer.has(element)) observer.connect(element, {
            disconnected: function disconnected() {
              dropEffect(hook);
            }
          });
        }

        return node;
      }
    );
  };

  exports.createContext = createContext;
  exports.hooked = hooked;
  exports.useCallback = useCallback;
  exports.useContext = useContext;
  exports.useEffect = useEffect;
  exports.useLayoutEffect = useLayoutEffect;
  exports.useMemo = useMemo;
  exports.useReducer = useReducer;
  exports.useRef = useRef;
  exports.useState = useState;
  exports.wait = wait;

  return exports;

}({}));
