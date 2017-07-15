/*
** actionCreator为create action的函数，如 function addCreator() { return { type: 'ADD' } }
** 调用addCreator 返回一个action， addCreator -> { type: 'ADD' }
**
** bindActionCreator作用为产生一个绑定了actionCreator及dispatch的函数
** 利用函数式的方式，实际是用闭包来暂存了actionCreator及dispatch，封装了逻辑，调用时感知不到
** 如bindActionCreator(addCreator, dispatch)返回的函数 function add() { dispatch(addCreator()); }
** 调用add时，为dispatch(addCreator())等同于dispatch({ type: 'ADD' })
** 当然也可以自己手动调用dispatch，bindActionCreator只是封装了逻辑，提供了方便
 */

function bindActionCreator(actionCreator, dispatch) {
  // bindActionCreator(actionCreator: funciton, dispatch: function): function
  return (...args) => dispatch(actionCreator(...args))
}

export default function bindActionCreators(actionCreators, dispatch) {
  // actionsCreators为单个函数时，直接调用bindActionCreator
  if (typeof actionCreators === 'function') {
    return bindActionCreator(actionCreators, dispatch)
  }

  // 不是对象或为空时，抛出错误
  if (typeof actionCreators !== 'object' || actionCreators === null)
    throw new Error('...')

  // actionCreators是个对象时 形如{ add: function {...}, remove: function {...} }时，分解，对其中每个函数调用bindActionCreator
  const keys = Object.keys(actionCreators)
  const boundActionCreators = {}
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const actionCreator = actionCreators[key]
    if (typeof actionCreator === 'function')
      boundActionCreators[key] = bindActionCreator(actionCreator, dispatch)
    else
      warning(`...`)
  }
  return boundActionCreators
}
