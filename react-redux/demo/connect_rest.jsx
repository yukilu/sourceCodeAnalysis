import { Component } from 'react';
import { render } from 'react-dom';
import { createStore } from 'redux';
import { Provider, connect } from 'react-redux';

/* 用redux管理count，实现了一个简单的Counter，并向ConnectedCounter传入了name属性，有效
 * 这个例子说明向connected的组件传递属性，最后可以到达原组件内，与向原组件传属性的效果相同(实际是渲染原组件时，将接收的属性传入)
 * 应该是connect时，render代码大概为
 * render() {
 *   const { propA, propB, ...rest } = this.props;
 *   return <wrapped propA={propA} propB={propB} {...rest} />
 * }
 *
 * children是其一个例子，详情见connect_children.jsx
 */ 
const actions = {
    increase: () => ({ type: 'INCREASE' })
};

function reducer(state = { count: 0 }, action) {
    const count = state.count;
    switch (action.type) {
        case 'INCREASE':
            return { count: count + 1 };
        default:
            return state;
    }
}

const store = createStore(reducer);

function Counter(props) {
    const { count, name, increase } = props;
    return(
        <div>
            <h3>Counter{name}</h3>
            <p>{count}</p>
            <button onClick={increase}>+</button>
        </div>
    );
}

function mapStateToProps(state) {
    return { count: state.count };
}

function mapDispatchToProps(dispatch) {
    return {
        increase: () => dispatch(actions.increase())
    };
}

const ConnectedCounter = connect(mapStateToProps, mapDispatchToProps)(Counter);

render(
    <Provider store={store}>
        <ConnectedCounter name='007' />
    </Provider>,
    document.getElementById('root')
);