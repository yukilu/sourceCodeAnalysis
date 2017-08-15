import { Component } from 'react';
import { render } from 'react-dom';
import { createStore } from 'redux';
import { Provider, connect } from 'react-redux';
import PropTypes from 'prop-types';

/* Connect1(a) -> A -> B -> Connect2(a) -> C
 * Connect1和Connect2监听同一个属性时，完整过程如下
 * 1. dispatch(action) -> Connect1.onStateChange -> Connect1.selector.run(props) -> Connect1.selector.shouldComponentUpdate = true
 * -> Connect1. setState({}) -> Connect1.render -> A.render -> B.render -> Connect2.willReceiveProps -> Connect2.selector.run(props)
 * -> Connect2.selector.shouldComponentUpdate = true -> Connect2.render -> C.render
 * 2. Connect1.onStateChange -> Connect2.onStateChange -> Connect2.selector.run(props) -> Connect2.selector.shouldComponentUpdate = false
 * 
 * 1. Connect1.onStateChange --> Connect1.setState({})
 * dispatch分发时触发Connect1的onStateChange，然后判断props是否发生改变，这里发生了改变，则会调用setState({})渲染整个组件树
 * 到Connect2时，Connect2判断props是否发生变化，若发生变化，则重新渲染
 * 2. Connect1.onStateChange --> Connect2.onStateChange 
 * 但是当Connect1.setState({})重新渲染结束后，Connect1.onStateChange会触发Connect2.onStateChange,此时，由于1中已经重新计算props
 * 并重新渲染过了，所以此处props并未改变，shouldComponentUpdate返回false，不会再重复渲染
 *
 * 由上可知，即Connect2是由Connect1.onStateChange触发的setState({})来重新渲染的，而不是Connect2.onStateChange
 * 渲染顺序为，Connect1.onStateChange触发的setState({})会重新渲染组件树，Connect2计算props并重新渲染，等setState渲染结束后
 * 才会再调用Connect2.onStateChange，此时，由于在Connect1.setState({})中Connect2重新渲染过了，这里计算的props未改变，不会再
 * 调用setState重新渲染
 */
function reducer(state = { a: 0 }, action) {
    switch(action.type) {
        case 'INCREASE':
            return { a: state.a + 1 };
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
        let { a, increase, children, name, myType } = this.props;
        if (a === undefined)
            a = this.context.store.getState().a;
        let button = <button onClick={increase}>INCREASE</button>;
        if (myType === 'none')
            button = null;

        return (
            <div>
                <h3>{name}</h3>
                <p>{`a = ${a}`}</p>
                {button}
                {children}
            </div>
        );
    }
}

function mapStateToProps(state) {
    return { a: state.a };
}

function mapDispatchToProps(dispatch) {
    return { increase: () => dispatch({ type: 'INCREASE' }) };
}

const ConnectA = connect(mapStateToProps, mapDispatchToProps)(A);

render(
    <Provider store={store}>
        <ConnectA name='ConnectA'>
            <A name='A' myType='none'>
                <A name='B' myType='none'>
                    <ConnectA name='ConnectB' >
                        <A name='C' />
                    </ConnectA>
                </A>
            </A>
        </ConnectA>
    </Provider>,
    document.getElementById('root')
);