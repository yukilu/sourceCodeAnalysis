import { Component } from 'react';
import { render } from 'react-dom';
import { createStore } from 'redux';
import { Provider, connect } from 'react-redux';

/* 2 Provider + 2 connect  Provider嵌套，两个Provider之间有connect，外层connect嵌套内层Provider
 * Provider -> connect -> Provider -> connect
 * 这里外层connect连接的是外层Provider，内层connect连接的是内层Provider，内层屏蔽了外层
 * store === anotherStore为true，连接的都是store，会互相影响，此处就省略了，演示了连接不同store时候的情况
 * 
 * <Provider store={store}>
 *     <ConnectedA>
 *         <Provider store={anotherStore}>
 *             <ConnectedB/>
 *         </Provider>
 *     </ConnectedA>
 * </Provider>
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
const anotherStore = createStore(reducer);

function mapStateToProps(state) {
    return { count: state.count };
}

function mapDispatchToProps(dispatch) {
    return {
        increase: ev => dispatch({ type: 'INCREASE' })
    };
}

@connect(mapStateToProps, mapDispatchToProps)
class Counter extends Component {
    render() {
        const { name, count, increase, children } = this.props;
        return (
            <div>
                <h3>Counter{name}</h3>
                <p>{count}</p>
                <button onClick={increase}>INCREASE</button>
                {children}
            </div>
        );
    }
}

render(
    <Provider store={store}>
            <Counter name="Outer">
                <Provider store={anotherStore}>
                    <Counter name="Inner" />
                </Provider>
            </Counter>
    </Provider>,
    document.getElementById('root')
);