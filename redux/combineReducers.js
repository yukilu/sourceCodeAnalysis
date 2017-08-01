/* 简化了代码，把错误处理都去除了
 *
 * 假设有函数a,b,c分别处理state中对应的a,b,c变量
 * 函数a处理state.a变量
 * function a(stateA, action) {
 *     switch (action.type) {
 *         case 'INCREASE':
 *             return stateA + 1;
 *         case 'DECREASE':
 *             return stateA - 1;
 *         default:
 *             return stateA;
 *     }
 * }
 * 函数b,c分别处理state.b,state.c
 * 
 * const reducers = { a, b, c }
 * const reducer = combineReducers(reducers)的执行过程类似于如下函数(具体的combine函数复杂些，会做些错误处理和性能优化)
 * function reducer(state={}, action) {
 *     return {
 *         a: reducers.a(state.a, action),
 *         b: reducers.b(state.b, action),
 *         c: reducers.c(state.c, action)
 *     };
 * }
 */

export default function combineReducers(reducers) {
  const reducerKeys = Object.keys(reducers)
  const finalReducers = {}
  for (let i = 0; i < reducerKeys.length; i++) {
    const key = reducerKeys[i]

    //过滤掉reducers对象中非函数的值
    if (typeof reducers[key] === 'function') {
      finalReducers[key] = reducers[key]
    }
  }
  //得到finalReducers的键名数组
  const finalReducerKeys = Object.keys(finalReducers) 

  return function combination(state = {}, action) {
    //判断state是否变化，以此决定返回值
    let hasChanged = false 
    //创建nextState空对象
    const nextState = {}
    //分别调用各个reduce函数改变对应的值
    for (let i = 0; i < finalReducerKeys.length; i++) {
      const key = finalReducerKeys[i]
      const reducer = finalReducers[key]
      //小reducer函数返回的是state中各个键对应的值，而非是包含对应键值的对象
      //state = { a: 0, b: 0 } (大reducer)--> state = { a: 1, b: 1 }
      //a = 0 (小reducer)--> a = 1，而非{ a: 0 } --> { a: 1 }
      //b = 0 (小reducer)--> b = 1, 而非{ b: 0 } --> { b: 1 }
      const previousStateForKey = state[key]
      const nextStateForKey = reducer(previousStateForKey, action)
      if (typeof nextStateForKey === 'undefined') {
        const errorMessage = getUndefinedStateErrorMessage(key, action)
        throw new Error(errorMessage)
      }
      nextState[key] = nextStateForKey
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey
    }
    return hasChanged ? nextState : state
  }
}
