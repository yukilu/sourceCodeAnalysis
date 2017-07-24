import { Component } from 'react';
import { render } from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import { Provider, connect } from 'react-redux';

const thunk = ({ disptach, getState }) => next => action => typeof action === 'function' ? action(dispatch, getState) : next(action);

const actions = {
    increase: () => ({ type: 'INCREASE' }),
    decrease: () => ({ type: 'DECREASE' })
};

function reducer(state={ count: 0 }, action) {
    const count = state.count;
    switch(action.type) {
        case 'INCREASE':
            return { count: count + 1 };
        case 'DECREASE':
            return { count: count - 1 };
        default:
            return state;
    }
}

const store = createStore(reducer, applyMiddleware(thunk));

function mapStateToProps(state) {
    return { count: state.count };
}

function mapDispatchToProps(dispatch) {
    return {
        increase: () => dispatch(actions.increase()),
        decrease: () => dispatch(actions.decrease())
    };
}

/*
 * ConnectedApp = connect(mapStateToProps, mapDispatchToProps, mergePorps, options)(app)
 * 1. mapStateToProps(state, ownProps) 将store中的state的属性通过该函数传入app的props中
 * 2. mapDispatchToProps(dispatch) 将dispatch处理action的逻辑封装成一个函数，并将其传入app的props中
 * 3. mergeProps函数将上述属性融合进原来传入app中的属性中，一并传入app，一般不用传该参数
 */
/*
 * decorator装饰器
 * 1. 作用于class时，分两种情况
 *   1) 若装饰器函数返回值不是一个对象，则 @dec class A 等同于 dec(A)
 *   2) 若装饰器函数返回值为一个对象(当然包括函数，js中类也是函数)，则 @dec class A 等同于 A = dec(A)
 * 2. 作用于class中的方法时，请google
 *
 * 作为模块时，还可以和export连用
 * @connect(mapStateToProps, mapDispatchToProps)
 * export default Counter extends Component { ... }
 */
@connect(mapStateToProps, mapDispatchToProps)
class Counter extends Component {
    render() {
        const { count, increase, decrease } = this.props;
        return (
            <div>
                <p>{count}</p>
                <button onClick={increase}>+</button><br/>
                <button onClick={decrease}>-</button>
            </div>
        );
    }
}

/*
 * Provider作用有二：
 * 1. 将store挂载到context上，并传入子组件
 * 2. 渲染唯一子组件，即connected的组件，然后connected的组件渲染包装的原组件
 */

/*
 * 关于渲染Provider，联系以上connect及Provider的作用
 * 1. 不一定要在根节点，可以包装成别的组件，再渲染，因Provider的两个作用与其在何处渲染并无关系，见ProviderWrap.jsx
 * 2. 唯一子组件不一定为connect后的组件，只要connect后的组件为Provider子组件中的一个即可
 *    因为Provider上述两个作用并不要求唯一子组件一定为conncted组件，只需要为其某个子组件即可，见connectedWrap.jsx
 * 3. 可以渲染多个Provider，如果传入的store的为同一个时候，子组件中使用的state的相同属性都是相同的
 *    子组件中用的属性皆来源于store中的state，store相同时，则其对应属性必然相同，见multiProvider_sameStore.jsx
 * 4. 可以渲染多个Provider，并传入不同的store，则不同Provider中子组件中使用的state都是独立的，见multiProvider_differentStore.jsx
 */
render(
    <Provider store={store} >
        <Counter />
    </Provider>,
    document.getElementById('root')
);