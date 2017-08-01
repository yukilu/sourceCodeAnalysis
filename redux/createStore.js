// 去除了一些错误处理，以及observable函数

export const ActionTypes = {
  INIT: '@@redux/INIT'
}

/* createStore分为两部分
 * 1. 传递中间件时，返回enhancer(createStore)(reducer, preloadedState)，enhancer函数也分为两部分
 *    1) createStore(reducer, preloadedState)，即调用createStore第二部分代码创建一个原生store
 *    2) 运用中间件加强dispatch，并将该dispatch覆盖store的原生dispatch生成一个加强版的store
 *       { ...store, dispatch }
 * 2. 不传递中间件时，创建一个原生store
 */
export default function createStore(reducer, preloadedState, enhancer) {
  // 一 包含中间件，返回enhancer(createStore)(reducer, preloadedState)，enhancer返回的是包含通过中间件加强了的dispatch的store

  // createStore(reducer, applyMiddleware(thunk)) 这种情况，即第二个参数传的是中间件
  // 重新校准参数，enhancer赋为函数，preloadedState赋为undefined
  if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
    enhancer = preloadedState
    preloadedState = undefined
  }

  // 除了上面的情况，还有种三个参数都传的情况 createStore(reducer, preloadedState, applyMiddleware(thunk)) 
  if (typeof enhancer !== 'undefined') {
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.')
    }

    // 进入enhancer函数，详情见applyMiddleware
    return enhancer(createStore)(reducer, preloadedState)
  }

  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.')
  }


  // 二 不包含中间件，直接返回原生store
  let currentReducer = reducer
  let currentState = preloadedState
  let currentListeners = []
  let nextListeners = currentListeners
  let isDispatching = false

  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice()
    }
  }

  function getState() {
    return currentState
  }

  // subscribe函数将需要监听的函数添加到全局变量的listeners(currentListeners, nextListeners)数组中
  // 返回值为一个函数，调用该函数，就会将对应的listener从listeners监听数组中删除
  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Expected listener to be a function.')
    }

    let isSubscribed = true

    ensureCanMutateNextListeners()
    nextListeners.push(listener)

    // 函数式编程，这里需要删除的listener就是上面传入的listener，这里是利用了闭包的特性
    return function unsubscribe() {
      if (!isSubscribed) {
        return
      }

      isSubscribed = false

      ensureCanMutateNextListeners()
      // 获取上面listener对应的index，然后通过splice(index, 1)删除
      const index = nextListeners.indexOf(listener)
      nextListeners.splice(index, 1)
    }
  }

  /* dispatch函数有两个作用
   * 1. 调用reducer函数，产生新的state
   * 2. 遍历listeners数组，逐个调用监听数组中的函数
   */ 
  function dispatch(action) {

    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions.')
    }

    try {
      isDispatching = true
      currentState = currentReducer(currentState, action)    // 通过reducer生成新的state
    } finally {
      isDispatching = false
    }

    // 遍历监听数组，逐个调用
    const listeners = currentListeners = nextListeners
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i]
      listener()
    }

    return action
  }

  // 热加载？
  function replaceReducer(nextReducer) {
    if (typeof nextReducer !== 'function') {
      throw new Error('Expected the nextReducer to be a function.')
    }

    currentReducer = nextReducer
    dispatch({ type: ActionTypes.INIT })
  }

  // When a store is created, an "INIT" action is dispatched so that every reducer returns their initial state.
  // This effectively populates the initial state tree.
  dispatch({ type: ActionTypes.INIT })

  return {
    dispatch,
    subscribe,
    getState,
    replaceReducer,
    [$$observable]: observable
  }
}
