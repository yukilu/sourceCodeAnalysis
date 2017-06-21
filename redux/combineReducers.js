//简化了代码，把错误处理都去除了

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
