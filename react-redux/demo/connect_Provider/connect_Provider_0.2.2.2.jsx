import { Component } from 'react';
import { render } from 'react-dom';
import { createStore } from 'redux';
import { Provider, connect } from 'react-redux';

// 无Provider，connect嵌套与有Provider时，效果相同
function reducer(state = { count: 0 }, action) {
    switch (action.type) {
        case 'ADD':
            return { count: state.count + 1 };
        default:
            return state;
    }
}

const store = createStore(reducer);
const anotherStore = createStore(reducer);

@connect(state => ({ count: state.count }), dispatch => ({ add: ev => dispatch({ type: 'ADD' }) }))
class Counter extends Component {
    render() {
        const { name, count, add, children } = this.props;
        return (
            <div>
                <h2>Counter{name}</h2>
                <p>{count}</p>
                <button onClick={add}>ADD</button>
                {children}
            </div>
        );
    }
}

render(
    <Counter name="Outer" store={store} >
        <Counter name="Inner" store={anotherStore} />
    </Counter>,
    document.getElementById('root')
);