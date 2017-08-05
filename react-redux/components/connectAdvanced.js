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
        // sourceSelector = function pureFinalPropsSelector(nextState, nextOwnProps)) { ... } (from selectorFactory.js)
        // 返回值为mergedProps，是处理state和ownProps的函数
        const nextProps = sourceSelector(store.getState(), props);
        if (nextProps !== selector.props || selector.error) { // 处理过后的props和原props比较
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
        const subscription = this.propsMode ? null : this.subscription;
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

        // 默认为this.context.storeSubcription，当为Provider下第一个connect时，为undefined
        const parentSub = (this.propsMode ? this.props : this.context)[subscriptionKey];
        this.subscription = new Subscription(this.store, parentSub, this.onStateChange.bind(this));
        this.notifyNestedSubs = this.subscription.notifyNestedSubs.bind(this.subscription);
      }

      onStateChange() {
        this.selector.run(this.props);

        if (!this.selector.shouldComponentUpdate)
          this.notifyNestedSubs();
        else {
          this.componentDidUpdate = this.notifyNestedSubsOnComponentDidUpdate;
          this.setState(dummyState);
        }
      }

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

    return hoistStatics(Connect, WrappedComponent);
  }
}
