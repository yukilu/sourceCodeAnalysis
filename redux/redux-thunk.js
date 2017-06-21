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

//把上面函数写出来如下
function thunkMiddleware(store) {
    return function (next) { //next为前一middleware返回值，利用了闭包和函数式特性，实现连环调用
        return function (action) {
            /*thunk函数加强了dispatch，使dispatch能处理函数，可以把异步逻辑封在函数内，从而是实现异步
            * 如dispatch(() => { setTimeout(() => { console.log(0); }, 1000) })
            * 此处当action为function时调用的是store.dispatch，而action为对象是调用的是next
            * 区别在于store.dispatch为最终加强的dispatch，包含thunk的功能，既能处理函数
            * 而next为前一middleware返回值，不包含当前thunk功能，即无法处理函数
            * 若用next替换store.dispatch，则异步处理时，传入的dispatch不会包含thunk功能，造成无法处理函数，会出错*/
            typeof action === 'function' ? action(store.dispatch, store.getState) : next(action);
        }
    }
}


//简写形式
const thunkMw = store => next => action => typeof action === 'function' ? action(store.dispatch, store.getState) : next(action);
