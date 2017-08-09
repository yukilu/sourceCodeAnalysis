export function wrapMapToPropsConstant(getConstant) {
  return function initConstantSelector(dispatch, options) {
    const constant = getConstant(dispatch, options);

    function constantSelector() { return constant; }
    constantSelector.dependsOnOwnProps = false;
    return constantSelector;
  }
}

// dependsOnOwnProps is used by createMapToPropsProxy to determine whether to pass props as args
// to the mapToProps function being wrapped. It is also used by makePurePropsSelector to determine
// whether mapToProps needs to be invoked when props have changed.
// 
// A length of one signals that mapToProps does not depend on props from the parent component.
// A length of zero is assumed to mean mapToProps is getting args via arguments or ...args and
// therefore not reporting its length accurately..
export function getDependsOnOwnProps(mapToProps) {
  return (mapToProps.dependsOnOwnProps !== null && mapToProps.dependsOnOwnProps !== undefined)
    ? Boolean(mapToProps.dependsOnOwnProps)
    : mapToProps.length !== 1;
}

// Used by whenMapStateToPropsIsFunction and whenMapDispatchToPropsIsFunction,
// this function wraps mapToProps in a proxy function which does several things:
// 
//  * Detects whether the mapToProps function being called depends on props, which
//    is used by selectorFactory to decide if it should reinvoke on props changes.
//    
//  * On first call, handles mapToProps if returns another function, and treats that
//    new function as the true mapToProps for subsequent calls.
//    
//  * On first call, verifies the first result is a plain object, in order to warn
//    the developer that their mapToProps function is not returning a valid result.
//    
export function wrapMapToPropsFunc(mapToProps, methodName) {
  return function initProxySelector(dispatch, { displayName }) {
    const proxy = function mapToPropsProxy(stateOrDispatch, ownProps) {
      /* initProxySelector时，proxy.dependsOnOwnProps默认设为true，所以第一次调用该函数时，就调用proxy.mapToProps(stateOrDispatch, ownProps)
       * 而在initProxySelector时，proxy.mapToProps = function detectFactoryAndVerify(stateOrDispatch, ownProps) { ... }
       * 所以第一次调用时，进入detectFactoryAndVerify函数，正如函数名字，重新对mapToProps和dependsOnOwnProps赋正确的值，然后重新调用
       * proxy，即mapToPropsProxy(stateOrDispatch, ownProps) { ... }，此时由于proxy.mapToProps已经被用户定义的mapToProps覆盖，所以就
       * 调用用户定义的mapToProps来生成新props，并查看props是函数还是普通对象，若为函数，则再将mapToProps用调用用户定义的mapToProps后
       * 返回的函数覆盖，并用再次调用proxy，用mapToProps新函数重新生成真正的props对象，最后新props返回
       *
       * 由上述过程知：
       * 1. mapStateToProps和mapDispatchToProps函数的返回值可以为对象或者函数
       * function mapStateToProps(state, ownProps) { return { a: state.a }; }
       * 
       * function mapStateToProps(state, ownProps) {
       *     // ...
       *     return function (state, ownProps) {
       *         // ...
       *         return { a: state.a };
       *     };
       * }
       *    1) 若为对象，则用该函数生成新的props
       *    2）若为函数，则会用返回的函数覆盖mapToProps，返回的函数才是真正生成新props的mapToProps
       * 2. 第一次调用proxy时，会先调用初始化时设定好的detectFactoryAndVerify，来检测mapToProps和dependsOnOwnProps应该赋的正确值
       *赋值及产生第一个props
       */
      return proxy.dependsOnOwnProps ? proxy.mapToProps(stateOrDispatch, ownProps) : proxy.mapToProps(stateOrDispatch);
    }

    proxy.dependsOnOwnProps = true;  // initProxySelector时默认设置为true

    proxy.mapToProps = function detectFactoryAndVerify(stateOrDispatch, ownProps) {
      proxy.mapToProps = mapToProps;
      proxy.dependsOnOwnProps = getDependsOnOwnProps(mapToProps);
      let props = proxy(stateOrDispatch, ownProps);

      if (typeof props === 'function') {
        proxy.mapToProps = props;
        proxy.dependsOnOwnProps = getDependsOnOwnProps(props);
        props = proxy(stateOrDispatch, ownProps);
      }

      return props;
    }

    return proxy;
  };
}
