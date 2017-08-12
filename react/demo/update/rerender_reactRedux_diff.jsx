import { Component } from 'react';
import { render } from 'react-dom';
import { createStore } from 'redux';
import { Provider, connect } from 'react-redux';
import PropTypes from 'prop-types';

/* Connect1(a) -> A -> B -> Connect2(b) -> C
 * 当Connect1和Connect2监听不同属性时
 * 1. 当dispatch分发action只引起a的改变时，b未变化
 * 1) dispatch(action) -> Connect1.onStateChange -> Connect1.selector.run(props) -> Connect1.selector.shouldComponentUpdate = true -> Connect1.setState({})
 * -> Connect1.render -> A.render -> B.render -> Connect2.willReceiveProps -> Connect2.selector.run(props) -> Connect2.selector.shouldComponentUpdate = false
 * dispatch(action)触发Connect1.onStateChange，计算props，发生了变化，触发setState({})，重新渲染组件树Connect1 -> A -> B
 * 当到达Connect2时，计算props，由于监听的b并未发生改变，所以shouldComponentUpdate返回false，当前及以前组件均不更新，update传播
 * 到此处断了
 * 2) Connect1.onStateChange -> Connect2.onStateChange -> Connect2.selector.run(props) -> Connect2.selector.shouldComponentUpdate = false
 * Connect1.onStateChange触发了Connect2.onStateChange，重新计算props，未变化，shouldComponentUpdate返回false，当前及以前组件均不更新
 *
 * 2. 当dispatch分发action时，a未变，b发生了变化
 * 1) dispatch(action) -> Connect1.onStateChange -> Connect1.selector.run(props) -> Connect1.selector.shouldComponentUpdate = false
 * 过程如上，props未改变，shouldComponentUpdate = false，则当前及以下组件均不重新渲染
 * 2) Connect1.onStateChange -> Connect2.onStateChange -> Connect2.selector.run(props) -> Connect2.selector.shouldComponentUpdate = true
 * -> Connect2.setState({}) -> Connect2.render -> C.render
 * Connect1.onStateChange触发了Connect2.onStateChange，重新计算props，发生了变化，shouldComponentUpdate返回true，当前及以下组件全部重新渲染
 */
function reducer(state = { a: 0, b: 10 }, action) {
    const { a, b } = state;
    switch(action.type) {
        case 'INCREASE':
            return { a: a + 1, b };
        case 'DECREASE':
            return { a, b: b + 1 };
        default:
            return state;
    }
}

const store = createStore(reducer);

class A extends Component {
    static contextTypes = { store: PropTypes.object };

    componentWillReceiveProps(nextProps) {
        console.log(`${this.props.name} receive`);
    }

    componentWillUpdate(nextProps) {
        console.log(`${this.props.name} willUpdate`);
    }

    componentDidUpdate(nextProps) {
        console.log(`${this.props.name} didUpdate`);
    }

    render() {
        const { increase, decrease, children, name, myType } = this.props;
        const { a, b } = this.context.store.getState();
        let button = null;
        if (myType === 'A')
            button = <button onClick={increase}>INCREASE</button>;
        else if (myType === 'B')
            button = <button onClick={decrease}>DECREASE</button>;
        else if (myType === 'ALL')
            button = <div><button onClick={increase}>INCREASE</button><br/><button onClick={decrease}>DECREASE</button></div>;

        return (
            <div>
                <h3>{name}</h3>
                <p>{`a = ${a}`}</p>
                <p>{`b = ${b}`}</p>
                {button}
                {children}
            </div>
        );
    }
}

function mapStateAToProps(state) {
    return { a: state.a };
}

function mapStateBToProps(state) {
    return { b: state.b };
}

function mapDispatchToProps(dispatch) {
    return {
        increase: () => dispatch({ type: 'INCREASE' }),
        decrease: () => dispatch({ type: 'DECREASE' })
    };
}

const ConnectA = connect(mapStateAToProps, mapDispatchToProps)(A);
const ConnectB = connect(mapStateBToProps, mapDispatchToProps)(A);

render(
    <Provider store={store}>
        <ConnectA myType='A' name='ConnectA'>
            <A name='A'>
                <A name='B'>
                    <ConnectB myType='B' name='ConnectB' >
                        <A name='C' />
                    </ConnectB>
                </A>
            </A>
        </ConnectA>
    </Provider>,
    document.getElementById('root')
);