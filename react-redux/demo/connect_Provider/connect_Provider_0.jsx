import { Component } from 'react';
import { render } from 'react-dom';
import { createStore } from 'redux';
import { connect } from 'react-redux';

// Provider不是必须的，只要直接给connect传入store就可以，效果于外面有Provider同
function reducer(state = { count: 0 }, action) {
    switch (action.type) {
        case 'ADD':
            return { count: state.count + 1 };
        default:
            return state;
    }
}

const store = createStore(reducer);

@connect(state => ({ count: state.count }), dispatch => ({ add: ev => dispatch({ type: 'ADD' }) }))
class Counter extends Component {
    render() {
        const { count, add } = this.props;
        return (
            <div>
                <p>{count}</p>
                <button onClick={add}>ADD</button>
            </div>
        );
    }
}

render(<Counter store={store} />, document.getElementById('root'));