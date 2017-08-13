export function impureFinalPropsSelectorFactory(mapStateToProps, mapDispatchToProps, mergeProps, dispatch) {
  return function impureFinalPropsSelector(state, ownProps) {
    return mergeProps(mapStateToProps(state, ownProps), mapDispatchToProps(dispatch, ownProps), ownProps);
  };
}

export function pureFinalPropsSelectorFactory(mapStateToProps, mapDispatchToProps, mergeProps, dispatch, { areStatesEqual, areOwnPropsEqual, areStatePropsEqual }) {
  let hasRunAtLeastOnce = false;
  let state, ownProps, stateProps, dispatchProps, mergedProps;

  function handleFirstCall(firstState, firstOwnProps) { // 第一次走这里，将上面的属性都初始化一遍
    state = firstState;
    ownProps = firstOwnProps;
    stateProps = mapStateToProps(state, ownProps);
    dispatchProps = mapDispatchToProps(dispatch, ownProps);
    mergedProps = mergeProps(stateProps, dispatchProps, ownProps);
    hasRunAtLeastOnce = true;
    return mergedProps;
  }

  function handleSubsequentCalls(nextState, nextOwnProps) { // 第二次开始走这里，根据情况选择下面三个函数之一执行
    const propsChanged = !areOwnPropsEqual(nextOwnProps, ownProps);  // props是否改变，shallowEqual
    const stateChanged = !areStatesEqual(nextState, state);  // state是否改变，strictEqual，若reducer产生的新的state，必然不是一个对象
    state = nextState;
    ownProps = nextOwnProps;

    if (propsChanged && stateChanged)
      return handleNewPropsAndNewState();
    if (propsChanged)
      return handleNewProps();
    if (stateChanged)
      return handleNewState();

    return mergedProps;
  }

  function handleNewPropsAndNewState() {  // 处理props和state同时改变的情况
    stateProps = mapStateToProps(state, ownProps);  // 不论mapStateToProps是否dependsOnOwnProps，state改变总会调用mapStateToProps

    if (mapDispatchToProps.dependsOnOwnProps)  // mapDispatchToProps与state无关，与是否dependsOnOwnProps有关，依赖props时才会调用
      dispatchProps = mapDispatchToProps(dispatch, ownProps);

    mergedProps = mergeProps(stateProps, dispatchProps, ownProps);
    return mergedProps;
  }

  // 处理仅是props改变的情况，mapStateToProps和mapDispatchToProps都要判断是否dependsOnOwnProps，因为上面判断props是通过浅相等
  // 判断的，所以这里props必然是改变了的，mergedProps必然与原来的不同，所以也就不需要判断stateProps,dispatchProps是否改变
  function handleNewProps() {
    if (mapStateToProps.dependsOnOwnProps)  // 因为state未变化，props改变时，mapStateToProps要判断是否dependsOnOwnProps，未依赖时，不需要调用
      stateProps = mapStateToProps(state, ownProps);

    if (mapDispatchToProps.dependsOnOwnProps) // mapDispatchToProps与state无关，与是否dependsOnOwnProps有关，依赖props时才会调用
      dispatchProps = mapDispatchToProps(dispatch, ownProps);

    mergedProps = mergeProps(stateProps, dispatchProps, ownProps);
    return mergedProps;
  }

  // 处理仅是state改变的情况，ownProps和dispatchProps未发生变化，所以需要判断stateProps是否发生变化，当其未变时，
  // 是不需要重新计算mergedProps，这与上面的handleNewProps时props必然改变导致mergedProps必然与原来不同的情况有差别
  function handleNewState() {
    const nextStateProps = mapStateToProps(state, ownProps); // 不需要判断是否dependsOnOwnProps，state改变时，不论是否依赖props，总会调用
    const statePropsChanged = !areStatePropsEqual(nextStateProps, stateProps);
    // shallowEqual，因为上面判断state是否相等时用的strictEqual，而state即使不是一个对象，对象的键值是可能相等的，即使键值不相等，
    // 调用函数后产生的新的stateProps的值也可能是相等的，而
    stateProps = nextStateProps;
    
    if (statePropsChanged)
      mergedProps = mergeProps(stateProps, dispatchProps, ownProps);

    return mergedProps;
  }

  return function pureFinalPropsSelector(nextState, nextOwnProps) {
    return hasRunAtLeastOnce ? handleSubsequentCalls(nextState, nextOwnProps) : handleFirstCall(nextState, nextOwnProps);
  }
}

export default function finalPropsSelectorFactory(dispatch, { initMapStateToProps, initMapDispatchToProps, initMergeProps, ...options }) {
  /* initMapStateToProps = initProxySelector (from wrapMapToProps.js)
   * mapStateToProps = mapToPropsProxy;
   * initMapStateToProps = (dispatch, { displayName }) => (stateOrDispatch, ownProps) => {
   *     return proxy.dependsOnOwnProps ? proxy.mapToProps(stateOrDispatch, ownProps) : proxy.mapToProps(stateOrDispatch);
   * };
   * 若最初传入的为function mapStateToProps(state) { return { a: state.a }; }
   * 则mapStateToProps = (stateOrDispatch, ownProps) => proxy.mapToProps(stateOrDispatch);
   * 由于proxy.mapStateToProps = function mapStateToProps(state) { ... }，就是传入的上面那个定义好的mapStateToProps
   * 实际上调用这里的mapStateToProps就调用proxy.mapToProps，而proxy.mapToProps就是上面传入的mapStateToProps
   * 所以最后的结果就是调用这里的mapStateToProps来产生新props就是调用了传入的mapToProps来产生新props
   * 之所以中间搞了那么多，是为了处理传入的mapStateToProps和mapDispatchToProps各种不同的值的情况 */
  const mapStateToProps = initMapStateToProps(dispatch, options); 
  const mapDispatchToProps = initMapDispatchToProps(dispatch, options);  // mapDispatchToProps和mapStateToProps情况差不多，不赘述
  const mergeProps = initMergeProps(dispatch, options);

  const selectorFactory = options.pure ? pureFinalPropsSelectorFactory : impureFinalPropsSelectorFactory;

  /* 默认pure = true, selectorFactory = pureFinalPropsSelectorFactory
   * pureFinalPropsSelectorFactory(mapStateToProps, mapDispatchToProps, mergeProps, dispatch, options)
   * 返回值为函数function pureFinalPropsSelector(nextState, nextOwnProps)) { ... } */
  return selectorFactory(mapStateToProps, mapDispatchToProps, mergeProps, dispatch, options);
}
