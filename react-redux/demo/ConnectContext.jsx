import { Component } from 'react';
import { render } from 'react-dom';
import { createStore, bindActionCreators } from 'redux';
import { Provider, connect } from 'react-redux';

/* 这个例子是在原组件上设定一个map属性指向this.props，这样子组件就可以通过context.map属性访问传入连接后的组件的属性
 * 以及从connect函数map进原组件的mapState和mapDispatch的各属性，而不用从被连接的原组件层层往下传，当然这种方法不提倡
 * 因为其实可以通过context.store，通过getState()直接访问state上的变量
 * 
 * 任意通过connect被连接的组件，其上的context都挂有两个变量
 * 1. store  Provider提供
 * 2. storeSubscription Connected组件提供
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
    return {    // 也可以用下面的bindActionCreator直接创建
        increase: () => { dispatch(actions.increase()); },
        decrease: () => { dispatch(actions.decrease()); }
    }
    // return bindActionCreators(actions, dispatch);
}

/* 渲染过程 ConnectedA -> A -> B -> Counter
 * 将connect函数map进props的属性及从ConnectedA上传入的属性都在A的this.props上
 * 通过childContexTypes及getChildContext将{ map: this.props }挂载在context上，传入子组件
 * 这样就不必层层往下传map进来的属性，只需要让子组件访问context.map即可
 * 当然用context的这种方法，react是不提倡的
 */

// 装饰器，此处等同于 A = connect(mapStateToProps, mapDispatchToProps)(A);
@connect(mapStateToProps, mapDispatchToProps)
class A extends Component {
    static childContextTypes = { map: PropTypes.object };

    getChildContext() {
        return { map: this.props };
    }

    render() {
        return <B />;
    }
}

function B(props, context) {
    /* 由下述contextTypes中的声明，这里打印出的context包含了以下三个属性
     * 1. store  由Provider组件提供
     * 2. storeSubscription  由ConnectedA组件(connect原组件后返回的连接组件)提供
     * 3. map  由原组件A提供
     */
    console.log(context);
    return <Counter />;
}

B.contextTypes = { store: PropTypes.object, map: PropTypes.object, storeSubscription: PropTypes.object };

class Counter extends Component {
    static contextTypes = { map: PropTypes.object };

    render() {
        const { name, count, increase, decrease } = this.context.map;
        return (
            <div>
                <h2>{`Counter${name}`}</h2>
                <p>{count}</p>
                <button onClick={increase}>+</button><br/>
                <button onClick={decrease}>-</button>
            </div>
        );
    }
}

render(
    <Provider store={store}>
        <A name="007"/>
    </Provider>,
    document.getElementById('root')
);