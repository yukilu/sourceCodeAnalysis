export function impureFinalPropsSelectorFactory(mapStateToProps, mapDispatchToProps, mergeProps, dispatch) {
  return function impureFinalPropsSelector(state, ownProps) {
    return mergeProps(mapStateToProps(state, ownProps), mapDispatchToProps(dispatch, ownProps), ownProps);
  };
}

export function pureFinalPropsSelectorFactory(mapStateToProps, mapDispatchToProps, mergeProps, dispatch, { areStatesEqual, areOwnPropsEqual, areStatePropsEqual }) {
  let hasRunAtLeastOnce = false;
  let state, ownProps, stateProps, dispatchProps, mergedProps;

  function handleFirstCall(firstState, firstOwnProps) { // 第一次走这里
    state = firstState;
    ownProps = firstOwnProps;
    stateProps = mapStateToProps(state, ownProps);
    dispatchProps = mapDispatchToProps(dispatch, ownProps);
    mergedProps = mergeProps(stateProps, dispatchProps, ownProps);
    hasRunAtLeastOnce = true;
    return mergedProps;
  }

  function handleSubsequentCalls(nextState, nextOwnProps) { // 第二次开始走这里，根据情况选择下面三个函数之一执行
    const propsChanged = !areOwnPropsEqual(nextOwnProps, ownProps);
    const stateChanged = !areStatesEqual(nextState, state);
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

  function handleNewPropsAndNewState() {
    stateProps = mapStateToProps(state, ownProps);

    if (mapDispatchToProps.dependsOnOwnProps)
      dispatchProps = mapDispatchToProps(dispatch, ownProps);

    mergedProps = mergeProps(stateProps, dispatchProps, ownProps);
    return mergedProps;
  }

  function handleNewProps() {
    if (mapStateToProps.dependsOnOwnProps)
      stateProps = mapStateToProps(state, ownProps);

    if (mapDispatchToProps.dependsOnOwnProps)
      dispatchProps = mapDispatchToProps(dispatch, ownProps);

    mergedProps = mergeProps(stateProps, dispatchProps, ownProps);
    return mergedProps;
  }

  function handleNewState() {
    const nextStateProps = mapStateToProps(state, ownProps);
    const statePropsChanged = !areStatePropsEqual(nextStateProps, stateProps);
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
