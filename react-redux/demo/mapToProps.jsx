import { Component } from 'react';
import { render } from 'react-dom';
import { createStore, bindActionCreators } from 'redux';
import { Provider, connect } from 'react-redux';

// 实现了一个简单的Counter组件

/* 这个例子是想说明，connect(mapStateToProps, mapDispatchToProps)(A)，通过connect中的mapState，mapDispatch传入A中
 * 的参数不是必须使用的，如果子组件与被连接的组件相距比较远，要使用map进去的属性就比较麻烦，要层层向下传递，此时，
 * 可以直接使用context.store上的getState获取state，来访问需要的参数，并且可以直接通过actions来访问各action，自己封
 * 装函数来dispatch(action)，也可以达到效果
 * 
 * 关于mapStateToProps，mapDispatchToProps，这两个函数map进对应属性，可以让子组件感觉不到redux的存在
 * 1. mapStateToProps (必须，通过监听map进去的属性来重新渲染组件树)
 *    1) 将要用到的state中的属性map进被连接组件，这样就不需要获取整个state，只需要获取所需属性，它的一个作用时，组件
 *    直接获取到了属性，不需要通过context.store获取，这样就会感觉不到redux的存在，所以其实获取这个属性不是必须的，也
 *    可以直接通过contex.store获取，这对于较远的子组件会方便些。
 *    通过context.store获取的属性与map进去的属性得值是相同的，因为后者的值本来就是由state上对应属性获取的
 *    2) 被map进去的属性会被监听，如果state上对应的属性值改变，会触发整个connected组件树重新渲染，若connect时，不传该函数，
 *    则不会监听任何state上的属性，state发生改变时也不会触发组件树重新渲染，这和没调用connect函数一个样，这样会使store中的
 *    state的变化无法反应到UI层上，就无法发挥redux的作用了
 * 2. mapDispatchToProps (非必须，可以在具体函数时自己封装，该函数时为了方便)
 *    1) 这个函数不是必须的，主要是为了封装dispatch(action)，使下面的子组件使用map进去的函数时，感觉不到dispatch的存在
 *    2) 事实上，可以不用该函数，而在较远的子组件中通过context.store.dispatch获取dispatch，然后自己写函数分发action
 */

const actions = {
    increase: () => ({ type: 'INCREASE' }),
    decrease: () => ({ type: 'DECREASE' })
};

function reducer(state={ count: 0 }, action) {
    const count = state.count;
    switch (action.type) {
        case 'INCREASE':
            return { count: count + 1 };
        case 'DECREASE':
            return { count: count - 1 };
        default:
            return state;
    }
}

const store = createStore(reducer);

function mapStateToProps(state) {
    return { count: state.count };
}

function mapDispatchToProps(dispatch) {
    return {
        increase: () => { dispatch(actions.increase()); },
        decrease: () => { dispatch(actions.decrease()); }
    }
}

@connect(mapStateToProps)   // 没有传入mapDispatchToProps，在下面自己直接用dispatch分发了action
class A extends Component { // 这个class中，并未使用map进去的属性count，在下面的子组件中是通过context.store.count获取的
    render() {
        return <B />;
    }
}

function B(props, context) {  // 该组件是为了将Counter组件隐藏深一点
    return <Counter />;
}

class Counter extends Component {
    static contextTypes = { store: PropTypes.object };  // 获取context.store

    render() {
        const { getState, dispatch } = this.context.store;  // 获取store.getState和store.dispatch
        const { count } = getState();   // 通过getState()获取state，并获得state.count
        return (    // 下面的onClick回调函数为自己实现dispatch逻辑，直接dispatch分发相应action
            <div>
                <h2>Counter</h2>
                <p>{count}</p>
                <button onClick={ev => dispatch(actions.increase())}>+</button><br/>
                <button onClick={ev => dispatch(actions.decrease())}>-</button>
            </div>
        );
    }
}

render(
    <Provider store={store}>
        <A />
    </Provider>,
    document.getElementById('root')
);