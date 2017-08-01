import { Component } from 'react';
import { render } from 'react-dom';
import { createStore } from 'redux';
import { Provider, connect } from 'react-redux';
import PropTypes from 'prop-types';

/* 把Provider进行了嵌套，并传了不同的store进去，是相互独立运行的
 * 同时说明内层的Provider的store会覆盖外层Provider的store
 * 这是因为context的机制，内层设置context属性时候，同名变量会覆盖外层，而Provider都是将store挂载到context上
 */
function reducer(state = { count: 0 }, action) {
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
const anotherStore = createStore(reducer);

function mapStateToProps(state) {
    return { count: state.count };
}

function mapDispatchToProps(dispatch) {
    return {
        increase: () => dispatch({ type: 'INCREASE' }),
        decrease: () => dispatch({ type: 'DECREASE' })
    };
}

@connect(mapStateToProps, mapDispatchToProps)
class Counter extends Component {
    render() {
        const { name, count, increase, decrease } = this.props;
        return (
            <div>
                <h2>Counter{name}</h2>
                <p>{count}</p>
                <button onClick={increase}>INCREASE</button><br/>
                <button onClick={decrease}>DECREASE</button>
            </div>
        );
    }
}

render(
    <Provider store={store}>
        <div>
            <Counter name="Outer" />
            <Provider store={anotherStore}>
                <Counter name="Inner" />
            </Provider>
        </div>
    </Provider>,
    document.getElementById('root')
);