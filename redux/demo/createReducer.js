// createReducer示例，还实现了一个简单的combineReducers函数

/*  原来的小reducer
 *  function count(state = 0, action) {
 *      switch (action.type) {
 *          case 'INCREASE':
 *              return state + 1;
 *          case 'DECREASE':
 *              return state - 1;
 *          default:
 *              return state;
 *      }
 *  }
 *
 *  function items(state = [], action) {
 *      const item = action.item;
 *      switch (action.type) {
 *          case 'PUSH':
 *              return [...state, item];
 *          case 'POP':
 *              state.pop();
 *              return [...state];
 *          default:
 *              return state;
 *      }
 *  }
 */

/* 将上述对应的type('INCREASE', 'DECREASE', 'PUSH', 'POP')逻辑封装进对应函数
 * 传入action只是为了使用除了action.type之外的属性
 * action.type不需要了，因为每个函数只有一种处理方式，只处理相应的type
 */
function increase(countState, action) {
    return countState + 1;
}

function decrease(countState, action) {
    return countState - 1;
}

function push(itemsState, action) {
    return [...itemsState, action.item];
}

function pop(itemsState, action) {
    itemsState.pop();
    return [...itemsState];
}

// 小reducer函数count,items重写为
function count(state = 0, action) {
    switch (action.type) {
        case 'INCREASE':
            return increase(state, action);
        case 'DECREASE':
            return decrease(state, action);
        default:
            return state;
    }
}

function items(state = [], action) {
    switch (action.type) {
        case 'PUSH':
            return push(state, action);
        case 'POP':
            state.pop();
            return pop(state, action);
        default:
            return state;
    }
}

/* createReducer函数，返回值为生成的reducer函数
 * 查看action.type值，传入的handlers中若存在相应type，则通过handlers[action.type]找到对应的函数调用
 */
function createReducer(initialState, handlers) {
    return function (state = initialState, action) {
        if (handlers.hasOwnProperty(action.type))
            return handlers[action.type](state, action);
        return state;
    };
}

/* handlers = { INCREASE: increase, DECREASE: decrease }
 * 当比如匹配到action.type为INCREASE时，handlers中若存在INCREASE属性时，则会调用handlers['INCREASE']函数
 * 即为increase函数，其他情况就会返回原来的state
 */
const countReducer = createReducer(0, {
    INCREASE: increase,
    DECREASE: decrease
});

const itemsReducer = createReducer([], {
    PUSH: push,
    POP: pop
});

function combineReducers(reducers) {
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

const reducer = combineReducers({ count: countReducer, items: itemsReducer });

let nextState = {};

// 调用reducer产生新state，并查看新state的值
function next(action) {
    nextState = reducer(nextState, action);
    console.log(nextState);
}

next({ type: 'INCREASE' });
next({ type: 'PUSH', item: 0 });
next({ type: 'PUSH', item: 1 });
next({ type: 'POP' });
next({ type: 'DECREASE' });