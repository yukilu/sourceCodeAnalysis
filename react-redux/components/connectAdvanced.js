import hoistStatics from 'hoist-non-react-statics';
import { Component, createElement } from 'react';

import Subscription from '../utils/Subscription';
import { storeShape, subscriptionShape } from '../utils/PropTypes';

let hotReloadingVersion = 0;
const dummyState = {};
function noop() {}
function makeSelectorStateful(sourceSelector, store) {
  const selector = {
    run: function runComponentSelector(props) {
      try {
        /* sourceSelector = function pureFinalPropsSelector(nextState, nextOwnProps)) { ... } (from selectorFactory.js)
        * 返回值为mergedProps，是处理state和ownProps的函数 */
        const nextProps = sourceSelector(store.getState(), props);
        /* 处理过后的props和原props比较，不相等时shouldComponentUpdate = true，然后更新selector.props的值
         * 相等时就什么都不做，因在render中会将shouldComponentUpdate设为false，所以每次渲染之后进这里默认是false
         * props也不覆盖，即使用原来的值 */
        if (nextProps !== selector.props || selector.error) {
          selector.shouldComponentUpdate = true;
          selector.props = nextProps;
          selector.error = null;
        }
      } catch (error) {
        selector.shouldComponentUpdate = true;
        selector.error = error;
      }
    }
  };

  return selector;
}
  
/* connect中调用connectAdvanced传入的参数
 * getDisplayName: name => `Connect(${name})` 覆盖 name => `ConnectAdvanced(${name})`
 * methodName: 'connect' 覆盖 'connectAdvanced'
 * shouldHandleStateChanges: Boolean(mapStateToProps) 覆盖 true
 * 下面的参数都在 ...connectOptions 内
 * initMapStateToProps, initMapDispatchToProps, initMergeProps,
 * pure, areStatesEqual, areOwnPropsEqual, areStatePropsEqual, areMergedPropsEqual,...extraOptions
 * 
 * selectorFactoryOptions = { ...connectOptions, ... }
 * const sourceSelector = selectorFactory(this.store.dispatch, selectorFactoryOptions)
 * finalPropsSelectorFactory(dispatch, { initMapStateToProps, initMapDispatchToProps, initMergeProps, ...options })
 */
export default function connectAdvanced(selectorFactory ,{
  getDisplayName = name => `ConnectAdvanced(${name})`,  
  methodName = 'connectAdvanced',
  shouldHandleStateChanges = true,
  renderCountProp = undefined, storeKey = 'store', withRef = false,
  ...connectOptions } = {}) {

  const subscriptionKey = storeKey + 'Subscription'; // 默认值为storeSubcription
  const version = hotReloadingVersion++;

  const contextTypes = { [storeKey]: storeShape, [subscriptionKey]: subscriptionShape };
  const childContextTypes = { [subscriptionKey]: subscriptionShape };

  return function wrapWithConnect(WrappedComponent) {
    const wrappedComponentName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

    const displayName = getDisplayName(wrappedComponentName);

    const selectorFactoryOptions = { ...connectOptions, getDisplayName, methodName, renderCountProp, shouldHandleStateChanges,
      storeKey, withRef, displayName, wrappedComponentName, WrappedComponent };

    class Connect extends Component {
      constructor(props, context) {
        super(props, context);

        this.version = version;
        this.state = {};
        this.renderCount = 0;
        this.store = props[storeKey] || context[storeKey];
        this.propsMode = Boolean(props[storeKey]); // 默认为false，默认是sotre通过Provider挂载到context上往下传
        this.setWrappedInstance = this.setWrappedInstance.bind(this);

        this.initSelector();
        this.initSubscription();
      }

      getChildContext() {
        const subscription = this.propsMode ? null : this.subscription;  // 默认false，值为this.subscription
        // 默认返回 { storeSubscription: this.subscription }
        return { [subscriptionKey]: subscription || this.context[subscriptionKey] };
      }

      componentDidMount() {
        if (!shouldHandleStateChanges)
          return;

        this.subscription.trySubscribe();
        this.selector.run(this.props);
        if (this.selector.shouldComponentUpdate)
          this.forceUpdate();
      }

      componentWillReceiveProps(nextProps) {
        this.selector.run(nextProps);
      }

      shouldComponentUpdate() {
        return this.selector.shouldComponentUpdate;
      }

      componentWillUnmount() {
        if (this.subscription)
          this.subscription.tryUnsubscribe();
        this.subscription = null;
        this.notifyNestedSubs = noop;
        this.store = null;
        this.selector.run = noop;
        this.selector.shouldComponentUpdate = false;
      }

      getWrappedInstance() {
        return this.wrappedInstance;
      }

      setWrappedInstance(ref) {
        this.wrappedInstance = ref;
      }

      initSelector() {
        /* selectorFactory = (dispatch, options) => (nextState, nextOwnProps) => {
         *     return hasRunAtLeastOnce ? handleSubsequentCalls(nextState, nextOwnProps) : handleFirstCall(nextState, nextOwnProps);
         * };
         * sourceSelector = (nextState, nextOwnProps) => { ... } 函数体内容如上
         * 
         * selectorFactory = function finalPropsSelectorFactory(dispatch, { initMapStateToProps, initMapDispatchToProps, initMergeProps, ...options }) { ... }
         * 返回值为函数 sourceSelector = function pureFinalPropsSelector(nextState, nextOwnProps)) { ... } (from selectorFactory.js)
         * pureFinalPropsSelector函数处理state和ownProps，返回mergedProps */
        const sourceSelector = selectorFactory(this.store.dispatch, selectorFactoryOptions);
        this.selector = makeSelectorStateful(sourceSelector, this.store);
        this.selector.run(this.props);
      }

      initSubscription() {
        if (!shouldHandleStateChanges)
          return;

        /* 默认为this.context.storeSubcription，当为Provider下第一个connect时，parentSub = undefined
         * 当为嵌套connect的内层时，parentSub = this.context.storeSubscription
         * this.context.storeSubcription是上层connect挂载的storeSubscription，为其subscription实例 */
        const parentSub = (this.propsMode ? this.props : this.context)[subscriptionKey];
        this.subscription = new Subscription(this.store, parentSub, this.onStateChange.bind(this));
        this.notifyNestedSubs = this.subscription.notifyNestedSubs.bind(this.subscription);
      }

      // onStateChange中不论props是否改变，即当前组件是否需要重新渲染，都会通过调用其挂载的subscription.notifyNestedSubs
      // 来触发下层组件的onStateChange，从而层层往下传递，层层调用onStateChange函数，思想与react组件的渲染和更新相同
      onStateChange() {
        this.selector.run(this.props);  // 重新计算props

        /* 1. props未变，不需要重新渲染时，直接通过notifyNestedSubs触发下层onStateChange
         * 直接调用当前组件下挂载的subscription的notifyNestedSubs，从而触发下层组件的onStateChange，具体过程参见Subscribtion.js
         * 中的addNestedSub及notifyNestedSubs函数注释
         * 2. props改变时，需要调用setState({})重新渲染，再通过ComponentDidUpdate触发下层onStateChange
         * ComponentDidUpdate重新赋值为notifyNestedSubsOnComponentDidUpdate(函数具体作用见对应注释)
         * 用setState({})(空对象，因state都托管给了redux)重新渲染当前组件
         * 当重新渲染完成后，再通过生命周期ComponentDidUpdate指向的回调函数调用notifyNestedSubs触发下层onStateChange
         */
        if (!this.selector.shouldComponentUpdate)
          this.notifyNestedSubs();  
        else {  
          this.componentDidUpdate = this.notifyNestedSubsOnComponentDidUpdate;
          this.setState(dummyState);
        }
      }

      /* ComponentDidUpdate调用完后，重新赋值undefined，这样再下次触发onStateChange时，如果不用重新渲染，DidUpdate函数就不该存在
       * 则其值应该再上次update后置空，或者在onStateChange中，如果不需要渲染时(if (!this.selector.shouldComponentUpdate))置空也可以
       * 然后再调用notifyNestedSubs触发下层组件的onStateChange函数 */
      notifyNestedSubsOnComponentDidUpdate() {
        this.componentDidUpdate = undefined;
        this.notifyNestedSubs();
      }

      isSubscribed() {
        return Boolean(this.subscription) && this.subscription.isSubscribed();
      }

      addExtraProps(props) {
        if (!withRef && !renderCountProp && !(this.propsMode && this.subscription))
          return props;

        const withExtras = { ...props };
        if (withRef)
          withExtras.ref = this.setWrappedInstance;
        if (renderCountProp)
          withExtras[renderCountProp] = this.renderCount++;
        if (this.propsMode && this.subscription)
          withExtras[subscriptionKey] = this.subscription;
        return withExtras;
      }

      render() {
        const selector = this.selector;
        selector.shouldComponentUpdate = false;

        if (selector.error)
          throw selector.error;
        else
          return createElement(WrappedComponent, this.addExtraProps(selector.props));
      }
    }

    Connect.WrappedComponent = WrappedComponent;
    Connect.displayName = displayName;
    Connect.childContextTypes = childContextTypes;
    Connect.contextTypes = contextTypes;
    Connect.propTypes = contextTypes;

    if (process.env.NODE_ENV !== 'production') {
      Connect.prototype.componentWillUpdate = function componentWillUpdate() {
        // We are hot reloading!
        if (this.version !== version) {
          this.version = version
          this.initSelector()

          if (this.subscription) this.subscription.tryUnsubscribe()
          this.initSubscription()
          if (shouldHandleStateChanges) this.subscription.trySubscribe()
        }
      }
    }

    return hoistStatics(Connect, WrappedComponent);  // 将被包裹组件的非React静态属性拷贝到Connect组件上
  }
}
