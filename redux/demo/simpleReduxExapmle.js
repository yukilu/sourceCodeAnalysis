// 简化版redux，实现了listen,dispatch函数，当然具体实现过程与源码不同，简化了逻辑，但实现思路相同

// 两个小reducer: count, items
function count(state = 0, action) {
    switch (action.type) {
        case 'INCREASE':
            return state + 1;
        case 'DECREASE':
            return state - 1;
        default:
            return state;
    }
}

function items(state = [], action) {
    const item = action.item;
    switch (action.type) {
        case 'PUSH':
            // return state.push(item)是不对的，push(item)返回的是item，下面的pop()，返回的是被删除的项目
            // 且array.push(item)，array.pop()，操作的是原数组
            return [...state, item];    // 展开操作符，会生成新数组
        case 'POP':
            state.pop();
            return [...state];
        default:
            return state;
    }
}

// const reducer = combineReducers({ count, items });

function reducer(state = {}, action) {
    return {
        count: count(state.count, action),
        items: items(state.items, action)
    };
}

const store = {
    state: {},
    listeners : [],
    // 监听函数时将需要监听的函数添加到listeners数组中，在dispatch中会遍历listeners数组，逐个调用
    listen : function (listener) {
        if (typeof listener !== 'function')
            return;
        const listeners = this.listeners;
        listeners.push(listener);
        // 返回值是个函数，调用这个函数，会将上面添加的函数从监听数组中删除
        return function () {
            for (let i = 0; i < listeners.length; i++)
                if (listeners[i] === listener) {
                    listeners.splice(i, 1);
                    break;
                }
        };
    },
    getState: function () {
        return this.state;
    },
    // dispatch函数有两个作用: 1. 调用reducer函数生成新state； 2. 遍历listeners数组，逐个调用监听函数
    dispatch: function (action) {
        const prevState = this.state;
        const nextState = reducer(prevState, action);
        if (!isPropertySame(prevState, nextState))
            this.state = nextState;
        this.listeners.forEach(f => f());
    }
};

// 判断两个对象中的属性值是否浅相等，若属性为对象，指向同一个地址则认为相同，指向不同地址认为不同
function isPropertySame(prev, next) {
    if (typeof prev !== 'object' || typeof next !== 'object')
        throw(new TypeError('prev || next'));
    return Object.keys(next).every(propName => {
        if (!next.hasOwnProperty(propName))
            return false;
        return prev[propName] === next[propName];
    });
}

const actions = {
    increase: () => ({ type: 'INCREASE' }),
    decrease: () => ({ type: 'DECREASE' }),
    push: item => ({ type: 'PUSH', item }),
    pop: () => ({ type: 'POP' })
};

const unlisten = store.listen(() => {
    console.log(store.getState());
});

store.listen(() => {
    console.log(store.listeners);
});

store.dispatch(actions.increase());
store.dispatch(actions.decrease());
store.dispatch(actions.push(0));
store.dispatch(actions.push(1));
store.dispatch(actions.pop());
unlisten();    // 移除第一个监听函数(打印state)
store.dispatch(actions.increase());