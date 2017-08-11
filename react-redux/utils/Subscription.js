// encapsulates the subscription logic for connecting a component to the redux store, as well as nesting subscriptions of
// descendant components, so that we can ensure the ancestor components re-render before descendants

const CLEARED = null;
const nullListeners = { notify() {} };

function createListenerCollection() {
  // the current/next pattern is copied from redux's createStore code.
  let current = [];    // 当前监听函数数组
  let next = [];    // 更新后监听函数数组

  return {
    clear() {
      next = CLEARED;
      current = CLEARED;
    },

    notify() {
      const listeners = current = next;
      for (let i = 0; i < listeners.length; i++) {
        listeners[i]();
      }
    },

    subscribe(listener) {
      let isSubscribed = true;
      // 如果next和current指向同一个数组，就从current复制一个数组，next指向它，这样向next添加监听函数时，current不受影响
      if (next === current)
        next = current.slice();
      next.push(listener);

      return function unsubscribe() {
        if (!isSubscribed || current === CLEARED)
          return;
        isSubscribed = false;
        // 理由同上，next和current指向同一个数组时，就复制一个并让next指向它，这样从next中删除监听函数时，current不受影响
        if (next === current)
          next = current.slice();
        next.splice(next.indexOf(listener), 1);
      };
    }
  };
}

export default class Subscription {
  constructor(store, parentSub, onStateChange) {
    this.store = store;
    this.parentSub = parentSub;  // 若存在，parentSub就是当前connect的上层Connected组件的subscription实例
    this.onStateChange = onStateChange;
    this.unsubscribe = null;
    this.listeners = nullListeners;
  }

  /* 这里addNestedSub和notifyNestedSubs也是层层传递的模式，与react渲染和更新组件的模式相同
   * 第二个开始的Connect组件的Subscription实例会调用上层subscription(parentSub)的addNestedSub函数，并传入当前组件的onStateChange
   * 一般来说组件初始化的时候会先调用一遍trySubscribe，所以此时unsubscribe一般为true，即此处的this.trySubscribe()未进行任何操作
   * 然后就是给当前subscription的listeners添加监听函数(下层组件的onStateChange)
   * 即Connect1.subscription.addNestedSub添加的是Connect2.onStateChange，而Connect2.subscription.addNestedSub添加的是Connect3.onStateChange ...
   * 上层Connect.subscription.addNestedSub添加的为下层Connect.onStateChange
   * 即Connect1.subscription.listeners中监听的是Connect2.onStateChange，Connect2.subscription.listeners监听的是Connect3.onStateChange
   * 上层Connect.subscription.listeners中监听的为下层Connect.onStateChange
   * 所以在notifyNestedSubs中，this.listeners.notify()时候调用的监听函数为下层Connect.onStateChange函数，而onStateChange函数中又会
   * 调用当前Connect.subscription.notifyNestedSubs，触发下下层Connect.onStateChange函数，如此层层往下传递
   * 最上层的Connect组件由于是store.subscribe(onStateChange)，是由store中state状态改变而触发，调用最上层Connect.subscription.notifyNestedSubs
   */
  addNestedSub(listener) {
    this.trySubscribe();
    return this.listeners.subscribe(listener);
  }

  notifyNestedSubs() {
    this.listeners.notify();
  }

  isSubscribed() {
    return Boolean(this.unsubscribe);
  }

  /* 1. 第一个Connect1组件时，parentSub = undefined，   this.unsubscribe = this.store.subscribe(Connect1.onStateChange)
  假设其挂载的subscription为subscription1
   * 2. 第二个Connect2组件时，parentSub为subscription1，this.unsubscribe = subscription1.addNestedSub(Connect2.onStateChange)
   * 3. 第三个Connect3组件时，parentSub为subscription2，this.unsubscribe = subscription2.addNestedSub(Connect3.onStateChange)
   * ...
   * 由以上规律知，当前Connect.trySubscribe()时，都是调用上层组件的subscription来添加当前组件的onStateChange函数
   * 即当前Connect.subscription.listeners监听的为下层组件的onStateChange函数，而第一个Connect组件的onStateChange由store监听
   * 由store.subscribe函数知只要dispatch分发action时，就会触发监听的函数，即会调用顶层Connect的onStateChange函数，查看监听
   * 的属性是否发生改变，再进行下一步处理
   */
  trySubscribe() {
    if (!this.unsubscribe) {
      this.unsubscribe = this.parentSub ? this.parentSub.addNestedSub(this.onStateChange) : this.store.subscribe(this.onStateChange);
 
      this.listeners = createListenerCollection();
    }
  }

  tryUnsubscribe() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
      this.listeners.clear();
      this.listeners = nullListeners;
    }
  }
};
