import { Component } from 'react';
import { render } from 'react-dom';
import { createStore } from 'redux';
import { Provider, connect } from 'react-redux';

/* 2 Provider + 2 connect  Provider嵌套，两个Provider之间没有connect，connect嵌套，store异同
 * Provider -> Provider -> ConnectedA -> ConnectedB
 * 相同时两层无意义，此处就演示了不同时，内层store覆盖外层store，连接的都是内层的anotherStore
 * <Provider store={store}>
 *     <Provider store={anotherStore}>
 *          <ConnectedA>
 *              <ConnectedB/>
 *          </ConnectedA>
 *     </Provider>
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
        <Provider store={anotherStore}>
            <Counter name="Outer">
                <Counter name="Inner" />
            </Counter>
        </Provider>
    </Provider>,
    document.getElementById('root')
);