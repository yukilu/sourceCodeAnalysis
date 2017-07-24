import { Component } from 'react';
import { createStore, applyMiddleware } from 'redux';
import { connect } from 'react-redux';

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

@connect(mapStateToProps, mapDispatchToProps)
export default class Counter extends Component {
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