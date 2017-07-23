function createStore(reducer, preloadedState, enhancer) {
    //...

    /*enhancer为applyMiddleware(...middlewares)返回值 createStore => (reducer, preloadedState) => { ... }
    * 来看如下分解
    * enhancer(createStore)返回值 (reducer, preloadedState) => { ... }
    * enhancer(createStore)(reducer, preloddedState)即调用下面函数函数体中内容，主要有以下两部分
    * 1.创建store  store = createStore(reducer, preloadedState)
    * 2.通过middlewares加强dispatch，并最后返回store时用加强的dispatch覆盖了原生dispatch
    * 
    * 总结：
    *     当createStore中传入applyMiddleware(...middlewares)返回的enhaner函数时，即使用了中间件后就会创建一个dispatch加强了的store对象
    * 如果没有应用中间件，则只会创建一个含有原生dispatch的普通store对象，即中间件的作用为加强了store对象的dispatch方法
    *
    * createStore函数分为两部分:
    * 1. 没有enhancer函数时，正常创建store对象
    * 2. 有enhancer函数时，调用enhancer(createStore)(reducer, preloadedState)创建通过中间件加强了dispatch的store对象
    * 
    * 而在调用enhancer(createStore)(reducer, preloadedState)时，在其函数内会调用createStore(reducer, preloadedState)来创建1中
    * 的普通store对象，在这部分就又会去调用createStore中没有enhancer函数时的代码，绕了一圈回到了1中情况
    * enhancer(createStore)(reducer, preloadedState)其实也可以直接写成enhancer(createStore, reducer, preloadedState)
    * 而applyMiddleware(...middlewares)返回值则要更改为(createStore, reducer, preloadedState) => { ... }的形式
    * 分开的写法可能是考虑到函数式编程的思想，实际上只是用了闭包来暂存变量
    */
    return enhancer(createStore)(reducer, preloadedState);
    //...
}

/* applyMiddleware(...middlewares)返回值为 createStore => (reducer, preloadedState) => { ... }
** 为一个函数，实际上传给createStore调用时，并未对middlewares处理，后面的createStore同理
** 只是利用了闭包的特性，写成函数式的方式，对middlewares,createStore变量进行了暂存
** 在合适的时候调用函数(reducer, preloadedState) => { ... } 并最终传入reducer，preloadedState再对他们一起进行处理
*/

//middlewares中传入的中间件的调用顺序为从左往右，所以一般异步中间件thunk放在第一个，放后面会造成前面的中间件调用两次
//applyMiddleware(m0, m1, m2, m3 ...)，m0 -> m1 -> m2 -> m3 ...
export default function applyMiddleware(...middlewares) {
  // 此处enhancer应该不用传了,因为createStore中就没传该参数
  return (createStore) => (reducer, preloadedState/*, enhancer*/) => {
    const store = createStore(reducer, preloadedState/*, enhancer*/)
    let dispatch = store.dispatch
    let chain = []

    //简化版store，只向middleware暴露了dispatch和getState函数
    const middlewareAPI = {
      getState: store.getState,
      dispatch: action => dispatch(action) //为啥非得写成这种形式，直接dispatch不行？
      /* 此处的玄机在于，如果直接写成 dispatch: dispatch，那么middlewareAPI中的dispatch永远指向store的原生dispatch
      ** 这样的话，在中间件middleware中调用的store.dispatch为原生dispatch，而并非加强过的dispatch，这就不符合要求了
      ** let dispatch = store.dispatch                 -> 原生
      ** dispatch = compose(...chain)(store.dispatch)  -> 加强
      ** 而写成函数形式action => { return dispatch(action); }，则当调用middlewareAPI.dispatch时，函数体{ return dipatch(action); }
      ** 中的dispatch则会在上层函数中寻找dispatch值，则此时dispatch已经为加强过的dispatch
      */
    }

    /* middleware函数形如 store => next => action => { ... }
    ** middleware(middlewareAPI)即为middleware(store)
    ** middleware(middlewareAPI)调用返回值为 next => action => { ... }
    */
    chain = middlewares.map(middleware => middleware(middlewareAPI))

    /* compose(f, g, h)(store.dispatch) 就是 f(g(h(store.dispatch)))
    ** middleware(middlewareAPI)(store.dispatch)调用返回值为 action => { ... }
    ** action => { ... } 就是dispatch函数的形式，此处通过middleware连环调用后覆盖原生 
    */
    dispatch = compose(...chain)(store.dispatch)

    // ...操作符展开store和...对数组作用类似，加强后的dispatch覆盖前面store中展开的原生dispatch
    return {
      ...store,
      dispatch
    }
  }
}
