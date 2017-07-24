function createThunkMiddleware(extraArgument) {
  return ({ dispatch, getState }) => next => action => {
    if (typeof action === 'function') {
      return action(dispatch, getState, extraArgument);
    }

    return next(action);
  };
}

const thunk = createThunkMiddleware();
thunk.withExtraArgument = createThunkMiddleware;

export default thunk;

/*
 *  编写中间件的注意点
 *  1. 格式 store => next => action => { ... }
 *  2. 一定要在代码体内调用next(action)，不然中间件没法串联起来
 *  3. 调用顺序等同递归，next前的代码先调用，next后的代码在next递归调用完全结束后才调用，具体例子及分析见compose部分
 *     所以next前代码 左 -> 右，next后代码 右 -> 左，整体上以next为分界线，顺序为 左->右->dispatch->右->左
 */

//把上面函数写出来如下
function thunkMiddleware(store) {
    return function (next) { //next为前一middleware返回值，利用了闭包和函数式特性，实现连环调用
        return function (action) {
            /*thunk函数加强了dispatch，使dispatch能处理函数，可以把异步逻辑封在函数内，从而是实现异步
            * 如dispatch(() => { setTimeout(() => { console.log(0); }, 1000) })
            * 所以当传入dispatch时，就可以异步dipatch(action)
            * dispatch(dispatch => { setTimeout(() => disptach(action), 1000); })
            * 实际上就是处理异步时，若action为函数，进入代码的action(dispatch)部分
            * 然后在适当时候调用dispatch(action)，进入函数代码另一部分，当然中间件中写法为next(action)
            */
           /*
            * 此处当action为function时调用的是store.dispatch，而action为对象是调用的是next，原因有二
            * 1. 区别在于store.dispatch为最终加强的dispatch，包含thunk的功能，既能处理函数
            *    而next为前一middleware返回值，不包含当前thunk功能，即无法处理函数
            *    若用next替换store.dispatch，则异步处理时，传入的dispatch不会包含thunk功能，造成无法处理函数，会出错
            * 2. 这个涉及applyMiddleware组件递归调用原理，具体请看applyMiddleware及compose部分，大概简述下
            *    在applyMiddleware(thunk, ...)中，一般thunk放在最左边，而组件调用顺序为从左往右，所以thunk总是第一个被调用
            *    当action为函数时，就会进入异步模式，调用函数，然后函数中定义好逻辑，在合适时候再调用dispatch
            *    当action为对象时，就直接dispatch(action)，而由于中间件的存在，要通过next来递归调用各个中间件
            */
            typeof action === 'function' ? action(store.dispatch, store.getState) : next(action);
        }
    }
}


//简写形式
const thunkMw = store => next => action => typeof action === 'function' ? action(store.dispatch, store.getState) : next(action);
