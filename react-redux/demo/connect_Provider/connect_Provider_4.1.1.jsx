import { Component } from 'react';
import { render } from 'react-dom';
import { createStore } from 'redux';
import { Provider, connect } from 'react-redux';

/*  2 Provider + 2 connect，Provider平行，store相同
 *  Provider(store) + Provider(store)
 *
 * <div>
 *     <Provider store={store}>
 *         <ConnectedA />
 *     </Provider>
 *     <Provider store={store}>
 *         <ConnectedB />
 *     </Provider>
 * </div>
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
    <div>
        <Provider store={store}>
            <Counter name="00" />
        </Provider>
        <Provider store={store}>
            <Counter name="01" />
        </Provider>
    </div>,
    document.getElementById('root')
);