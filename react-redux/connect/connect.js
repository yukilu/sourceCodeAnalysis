import connectAdvanced from '../components/connectAdvanced';
import shallowEqual from '../utils/shallowEqual';
import defaultMapDispatchToPropsFactories from './mapDispatchToProps';
import defaultMapStateToPropsFactories from './mapStateToProps';
import defaultMergePropsFactories from './mergeProps';
import defaultSelectorFactory from './selectorFactory';

/* connect函数作用:
 * 1. 将state上对应属性和一些dispatch操作map进被连接组件内
 * 2. 监听map进原组件内的属性在state上对应的属性的变化，若值改变，就重新渲染connected组件树
 *    实现代码为store.subscribe(this.onStateChange)
 * 
 * connect函数起到了将redux里store中state上的属性值传入组件并在值更新时触发重新渲染
 * 而且将store.dispatch操作传入组件内，真正起到了连接redux和react的作用
 */

function match(arg, factories, name) {
  for (let i = factories.length - 1; i >= 0; i--) {
    const result = factories[i](arg);
    if (result)
      return result;
  }

  return (dispatch, options) => {
    throw new Error(`Invalid value of type ${typeof arg} for ${name} argument when connecting component ${options.wrappedComponentName}.`);
  }
}

function strictEqual(a, b) { return a === b; }

export function createConnect({ connectHOC = connectAdvanced, mapStateToPropsFactories = defaultMapStateToPropsFactories,
mapDispatchToPropsFactories = defaultMapDispatchToPropsFactories, mergePropsFactories = defaultMergePropsFactories,
selectorFactory = defaultSelectorFactor } = {}) {

  return function connect(mapStateToProps, mapDispatchToProps, mergeProps,{ pure = true, areStatesEqual = strictEqual, areOwnPropsEqual = shallowEqual,
    areStatePropsEqual = shallowEqual, areMergedPropsEqual = shallowEqual, ...extraOptions } = {}) {

    /* mapStateToProps为自己传入 function mapStateToProps(state, ownProps) { return { a: state.a }; }
     * createConnect({ ...  mapStateToPropsFactories = defaultMapStateToPropsFactories} = {}) { ... }
     * import defaultMapStateToPropsFactories from './mapStateToProps';
     * mapStateToPropsFactories -> defaultMapStateToPropsFactories -> [whenMapStateToPropsIsFunction, whenMapStateToPropsIsMissing]
     * 若mapStateToProps为函数 initMapStateToProps = wrapMapToPropsFunc(mapStateToProps, 'mapStateToProps') -> initProxySelector */
    const initMapStateToProps = match(mapStateToProps, mapStateToPropsFactories, 'mapStateToProps');
    const initMapDispatchToProps = match(mapDispatchToProps, mapDispatchToPropsFactories, 'mapDispatchToProps');
    const initMergeProps = match(mergeProps, mergePropsFactories, 'mergeProps');

    // connectHOC -> connectAdvanced
    return connectHOC(selectorFactory, {
      /* createConnect({... selectorFactory = defaultSelectorFactor} = {}) { ... }
       * import defaultSelectorFactory from './selectorFactory';
       * selectorFactory -> defaultSelectorFactor -> finalPropsSelectorFactory */
      methodName: 'connect', getDisplayName: name => `Connect(${name})`, 
      shouldHandleStateChanges: Boolean(mapStateToProps), // mapStateToProps存在->true，不存在->false
      /* initMapStateToProps = match(...) = wrapMapToPropsFunc(mapStateToProps, 'mapStateToProps')
       * 返回值为函数 function initProxySelector(dispatch, { displayName }) { ... } (from wrapMapToProps.js) */
      initMapStateToProps,
      initMapDispatchToProps,
      initMergeProps,
      pure, areStatesEqual, areOwnPropsEqual, areStatePropsEqual, areMergedPropsEqual,...extraOptions
    });
  };
}

export default createConnect();
