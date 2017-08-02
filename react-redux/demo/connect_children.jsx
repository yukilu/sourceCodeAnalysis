import { Component } from 'react';
import { render } from 'react-dom';
import { createStore } from 'redux';
import { Provider, connect } from 'react-redux';

/* 之前的示例都是单标签，当连接双标签时，还是同样起作用的
 * 当Connected组件为双标签，有children时，渲染原组件时，会将children属性传入原组件一并渲染
 * <A><h2>A</h2></A>，将A连接后，<ConnectedA><h2>A</h2></ConnectedA>会起到与原组件相同效果
 * class A extends Component {
 *     return React.Children.only(this.children);
 * }
 *
 * 原理是，当ConnectedA的render中返回A时，将children属性一并传入
 * render() {
 *   const { propA, children, ...rest } = this.props;
 *   return <wrapped propA={propA} children={children} {...rest} />
 * }
 * 这与往连接组件中传入属性时，也会传达到原组件的原理是一样的，children只是其一个特殊例子而已
 * 详情见connect_rest.jsx
 */
function reducer(state = { count: 0 }, action) {
    switch (action.type) {
        case 'INCREASE':
            return { count: state.count + 1 };
        default:
            return state;
    }
}

const store = createStore(reducer);

function mapStateToProps(state) {
    return { count: state.count };
}

@connect(mapStateToProps)
class Counter extends Component {
    render() {
        const { count, children } = this.props;
        return (
            <div>
                <div>{children}</div>
                <p>{count}</p>
                <button onClick={ev => store.dispatch({ type: 'INCREASE' })}>INCREASE</button>
            </div>
        );
    }
}

render(
    <Provider store={store}>
        <Counter>
            <h2>Counter</h2>
        </Counter>
    </Provider>,
    document.getElementById('root')
);