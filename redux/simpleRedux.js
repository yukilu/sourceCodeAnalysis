/* 简化版redux，未实现中间件，具体实现过程与源码不同，简化了逻辑，但实现思路相同
 * 实现了createStore, combineReducers, createReducer函数 */

/* 定义了一个不常用的type，该值可自由定义，然后在最后dispatch({ type: '@@redux/INIT' })时，保证进reducer中switch的default，
 * 将传入的preloadedState或reducer中定义的初始值返回 */
const ActionTypes = { INIT: '@@redux/INIT' };

export function createStore(reducer, preloadedState) {
    let state = preloadedState;
    let listeners = [];

    const store = {
        // 监听函数时将需要监听的函数添加到listeners数组中，在dispatch中会遍历listeners数组，逐个调用
        subscribe : function (listener) {
            if (typeof listener !== 'function')
                return;
            listeners.push(listener);
            
            let isCleared = false;
            // 返回值是个函数，调用这个函数，会将上面添加的函数从监听数组中删除
            return function () {
                if (isCleared)
                    return;
                isCleared = true;

                for (let i = 0; i < listeners.length; i++)
                    if (listeners[i] === listener) {
                        listeners.splice(i, 1);
                        break;
                    }
            };
        },
        getState: function () {
            return state;
        },
        // dispatch函数有两个作用: 1. 调用reducer函数生成新state； 2. 遍历listeners数组，逐个调用监听函数
        dispatch: function (action) {
            state = reducer(state, action);
            listeners.forEach(f => f());

            return action;
        }
    };

    store.dispatch({ type: ActionTypes.INIT });  // 初始化state值

    return store;
}

// 连接小reducer生成大reducer的函数，完整源代码见combineReducer.js，这里是简单实现了核心功能
export function combineReducers(reducers) {
    const reducerKeys = Object.keys(reducers);

    return function (state = {}, action) {
        const nextState = {};
        let hasChanged = false;
        let key, reducer, prevValue, nextValue;

        for (let i = 0; i < reducerKeys.length; i++) {
            key = reducerKeys[i];
            reducer = reducers[key];
            prevValue = state[key];
            nextValue = reducer(prevValue, action);
            nextState[key] = nextValue;

            if (prevValue !== nextValue)
                hasChanged = true;
        }

        return hasChanged ? nextState : state;
    };
}

// 用来生成小reducer，替代switch的判断方式，示例见createReducer.js
export function createReducer(initialState, handlers) {
    return function (state = initialState, action) {
        if (handlers.hasOwnProperty(action.type))
            return handlers[action.type](state, action);
        return state;
    };
}