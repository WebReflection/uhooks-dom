self.uhooksDOM = (function (exports) {
  'use strict';

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
  const observe = (root, parse, CE, MO) => {
    const observed = new WeakMap;

    // these two should be WeakSet but IE11 happens
    const wmin = new WeakMap;
    const wmout = new WeakMap;

    const has = node => observed.has(node);
    const disconnect = node => {
      if (has(node)) {
        listener(node, node.removeEventListener, observed.get(node));
        observed.delete(node);
      }
    };
    const connect = (node, handler) => {
      disconnect(node);
      if (!(handler || (handler = {})).handleEvent)
        handler.handleEvent = handleEvent;
      listener(node, node.addEventListener, handler);
      observed.set(node, handler);
    };

    const listener = (node, method, handler) => {
      method.call(node, 'disconnected', handler);
      method.call(node, 'connected', handler);
    };

    const notifyObserved = (nodes, type, wmin, wmout) => {
      for (let {length} = nodes, i = 0; i < length; i++)
        notifyTarget(nodes[i], type, wmin, wmout);
    };

    const notifyTarget = (node, type, wmin, wmout) => {
      if (has(node) && !wmin.has(node)) {
        wmout.delete(node);
        wmin.set(node, 0);
        node.dispatchEvent(new (CE || CustomEvent)(type));
      }
      notifyObserved(node[parse || 'children'] || [], type, wmin, wmout);
    };

    const mo = new (MO || MutationObserver)(nodes => {
      for (let {length} = nodes, i = 0; i < length; i++) {
        const {removedNodes, addedNodes} = nodes[i];
        notifyObserved(removedNodes, 'disconnected', wmout, wmin);
        notifyObserved(addedNodes, 'connected', wmin, wmout);
      }
    });

    mo.add = add;
    mo.add(root || document);

    const {attachShadow} = Element.prototype;
    if (attachShadow)
      Element.prototype.attachShadow = function (init) {
        const sd = attachShadow.call(this, init);
        mo.add(sd);
        return sd;
      };

    return {has, connect, disconnect, kill() { mo.disconnect(); }};
  };

  function add(node) {
    this.observe(node, {subtree: true, childList: true});
  }

  function handleEvent(event) {
    if (event.type in this)
      this[event.type](event);
  }

  let info = null, schedule = new Set;

  const invoke = effect => {
    const {$, r, h} = effect;
    if (isFunction(r)) {
      fx$1.get(h).delete(effect);
      r();
    }
    if (isFunction(effect.r = $()))
      fx$1.get(h).add(effect);
  };

  const runSchedule = () => {
    const previous = schedule;
    schedule = new Set;
    previous.forEach(({h, c, a, e}) => {
      // avoid running schedules when the hook is
      // re-executed before such schedule happens
      if (e)
        h.apply(c, a);
    });
  };

  const fx$1 = new WeakMap;
  const effects = [];
  const layoutEffects = [];

  function different(value, i) {
    return value !== this[i];
  }
  const dropEffect = hook => {
    const effects = fx$1.get(hook);
    if (effects)
      wait.then(() => {
        effects.forEach(effect => {
          effect.r();
          effect.r = null;
          effect.d = true;
        });
        effects.clear();
      });
  };

  const getInfo = () => info;

  const hasEffect = hook => fx$1.has(hook);

  const isFunction = f => typeof f === 'function';

  const hooked$2 = callback => {
    const current = {h: hook, c: null, a: null, e: 0, i: 0, s: []};
    return hook;
    function hook() {
      const prev = info;
      info = current;
      current.e = current.i = 0;
      try {
        return callback.apply(current.c = this, current.a = arguments);
      }
      finally {
        info = prev;
        if (effects.length)
          wait.then(effects.forEach.bind(effects.splice(0), invoke));
        if (layoutEffects.length)
          layoutEffects.splice(0).forEach(invoke);
      }
    }
  };

  const reschedule = info => {
    if (!schedule.has(info)) {
      info.e = 1;
      schedule.add(info);
      wait.then(runSchedule);
    }
  };

  const wait = Promise.resolve();

  const createContext = value => ({
    _: new Set,
    provide,
    value
  });

  const useContext = ({_, value}) => {
    _.add(getInfo());
    return value;
  };

  function provide(newValue) {
    const {_, value} = this;
    if (value !== newValue) {
      this._ = new Set;
      this.value = newValue;
      _.forEach(({h, c, a}) => {
        h.apply(c, a);
      });
    }
  }

  const useCallback = (fn, guards) => useMemo(() => fn, guards);

  const useMemo = (memo, guards) => {
    const info = getInfo();
    const {i, s} = info;
    if (i === s.length || !guards || guards.some(different, s[i]._))
      s[i] = {$: memo(), _: guards};
    return s[info.i++].$;
  };

  const createEffect = stack => (callback, guards) => {
    const info = getInfo();
    const {i, s, h} = info;
    const call = i === s.length;
    info.i++;
    if (call) {
      if (!fx$1.has(h))
        fx$1.set(h, new Set);
      s[i] = {$: callback, _: guards, r: null, d: false, h};
    }
    if (call || !guards || s[i].d || guards.some(different, s[i]._))
      stack.push(s[i]);
    s[i].$ = callback;
    s[i]._ = guards;
    s[i].d = false;
  };

  const useEffect = createEffect(effects);

  const useLayoutEffect = createEffect(layoutEffects);

  const getValue = (value, f) => isFunction(f) ? f(value) : f;

  const useReducer$1 = (reducer, value, init) => {
    const info = getInfo();
    const {i, s} = info;
    if (i === s.length)
      s.push({
        $: isFunction(init) ?
            init(value) : getValue(void 0, value),
        set: value => {
          s[i].$ = reducer(s[i].$, value);
          reschedule(info);
        }
      });
    const {$, set} = s[info.i++];
    return [$, set];
  };

  const useState$1 = value => useReducer$1(getValue, value);

  const useRef = current => {
    const info = getInfo();
    const {i, s} = info;
    if (i === s.length)
      s.push({current});
    return s[info.i++];
  };

  /*! (c) Andrea Giammarchi - ISC */

  let h = null, c = null, a = null;

  const fx = new WeakMap;
  const states = new WeakMap;

  const set = (h, c, a, update) => {
    const wrap = value => {
      if (!fx.has(h)) {
        fx.set(h, 0);
        wait.then(() => {
          fx.delete(h);
          h.apply(c, a);
        });
      }
      update(value);
    };
    states.set(update, wrap);
    return wrap;
  };

  const wrap = (h, c, a, state) => (
    h ? [
      state[0],
      states.get(state[1]) || set(h, c, a, state[1])
    ] :
    state
  );

  const hooked$1 = (callback, outer) => {
    const hook = hooked$2(
      outer ?
        /*async*/ function () {
          const [ph, pc, pa] = [h, c, a];
          [h, c, a] = [hook, this, arguments];
          try {
            return /*await*/ callback.apply(c, a);
          }
          finally {
            [h, c, a] = [ph, pc, pa];
          }
        } :
        callback
    );
    return hook;
  };

  const useReducer = (reducer, value, init) =>
                              wrap(h, c, a, useReducer$1(reducer, value, init));

  const useState = value => wrap(h, c, a, useState$1(value));

  /*! (c) Andrea Giammarchi - ISC */
  const observer = observe(document, 'children', CustomEvent);

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
    const hook = hooked$1(fn, outer);
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

})({});
