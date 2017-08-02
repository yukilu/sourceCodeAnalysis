import { Component } from 'react';
import { render } from 'react-dom';
import { createStore } from 'redux';
import { Provider, connect } from 'react-redux';

/*  1 Provider + 2 connect，connect嵌套
 *  Provider -> ConnectedA -> ConnectedB
 *  
 *  <Provider store={store}>
 *      <ConnectedA>
 *          <ConnectedB />
 *      </ConnectedA>
 *  </Provider>
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
        const { name, count, children } = this.props;
        return (
            <div>
                <h3>Counter{name}</h3>
                <p>{count}</p>
                <button onClick={ev => store.dispatch({ type: 'INCREASE' })}>INCREASE</button>
                {children}
            </div>
        );
    }
}

render(
    <Provider store={store}>
        <Counter name="Outer">
            <Counter name="Inner"/>
        </Counter>
    </Provider>,
    document.getElementById('root')
);