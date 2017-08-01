import { Component } from 'react';
import { render } from 'react-dom';
import { createStore, combineReducers } from 'redux';
import { Provider, connect } from 'react-redux';

/* 此处将connected组件进行了嵌套，这是可以的，没有问题
 * 此处被连接的A组件下，嵌套了被连接的B组件，可以正常运作
 * 两个connected组件平行的情况不用试，肯定可以正常运作
 */
const actions = {
    increase: () => ({ type: 'INCREASE' }),
    multiply: () => ({ type: 'MULTIPLY' })
};

function a(state = 0, action) {
    switch (action.type) {
        case 'INCREASE':
            return state + 1;
        default:
            return state;
    }
}

function b(state = 1, action) {
    switch (action.type) {
        case 'MULTIPLY':
            return state * 2;
        default:
            return state;
    }
}

const reducer = combineReducers({ a, b });

const store = createStore(reducer);

function mapStateToPropA(state) {
    return { a: state.a };
}

function mapDispatchToPropA(dispatch) {
    return { increase: () => dispatch(actions.increase()) };
}

@connect(mapStateToPropA, mapDispatchToPropA)
class A extends Component {
    render() {
        const { a, increase } = this.props;
        return (
            <div>
                <p>{a}</p>
                <button onClick={increase}>INCREASE</button>
                <hr/>
                <B />
            </div>
        );
    }
}

function mapStateToPropB(state) {
    return { b: state.b };
}

function mapDispatchToPropB(dispatch) {
    return { multiply: () => dispatch(actions.multiply()) };
}

@connect(mapStateToPropB, mapDispatchToPropB)
class B extends Component {
    render() {
        const { b, multiply } = this.props;
        return (
            <div>
                <p>{b}</p>
                <button onClick={multiply}>MULTIPLY</button>
            </div>
        );
    }
}

render(
    <Provider store={store}>
        <A />
    </Provider>,
    document.getElementById('root')
);