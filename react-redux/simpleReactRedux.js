import { Component, Children, createElement } from 'react';
import PropTypes from 'prop-types';

/* 实现了一个最简单的react-redux，没做错误处理，并简化了Connect组件，去掉了非必要属性，并且无法嵌套，只能单一使用
 * 但是该简单实现，基本保留了源码的设计思想，如selector, factory等 */

// Provider组件，提供了最核心的功能，将store挂载到context上，传入子组件，并且render返回值为props.children
export class Provider extends Component {
    static childContextTypes = { store: PropTypes.object };

    getChildContext() {
        return { store: this.props.store };
    }

    render() {
        return Children.only(this.props.children);
    }
}

const dummyState = {};  // setState({})，因为state都给redux的store托管了，所以为了rerender，setState空对象即可

function noop() {}  // 空函数，组件注销时，赋给selector.run

// 此处与源码略微不同，源码是通过函数返回了selector对象，这里用面向对象的方法实现，效果是等同的
class Selector {
    constructor(sourceSelector, store) {
        this.sourceSelector = sourceSelector;
        this.store = store;
    }

    run(props) {
        const nextProps = this.sourceSelector(this.store.getState(), props);
        if (this.props !== nextProps) {
            this.props = nextProps;
            this.shouldComponentUpdate = true;
        }
    }
}

// 源码通过调用connectAdvanced(...)函数来返回connect函数，这里就将过程简化，直接定义connect函数
export function connect(mapStateToProps = defaultMapToProps, mapDispatchToProps = defaultMapToProps, mergeProps = defaultMergeProps) {
    return function (WrappedComponent) {
        const selectorFactoryOptions = { mapStateToProps, mapDispatchToProps, mergeProps };
        setDependsOnOwnProps(mapStateToProps);
        setDependsOnOwnProps(mapDispatchToProps);

        class Connect extends Component {
            static contextTypes = { store: PropTypes.object };

            constructor(props, context) {
                super(props, context);
                const store = this.context.store;
                this.store = store;
                this.state = {};

                /* 源码中有subscription对象，connect嵌套时，将他们串起来，这里简化，去除了subscription，所以该简单实现的react-redux
                 * 无法嵌套connect，就直接将onStateChange由store订阅，与源码的顶层connect方式同，dispatch分发action时，就触发 */
                this.unsubscribe = store.subscribe(this.onStateChange.bind(this));
                this.initSelector();
            }

            /* 初始化selector，selectorFactory也简化处理了，但是核心代码基本与源码相同，设计思想也未变
             * 1. selectorFactory中传入mapStateToProps, mapDispatchToProps, mergeProps等，然后由这些map和merge函数生成一个根据
             * state和props生成传入wrappedComponent的新props的sourceSelector函数，函数式编程，实际上就是将map和merge函数的变量
             * 利用闭包特性暂存起来了
             * 2. 将sourceSelector传入构造函数Selector中来生成selector实例，调用其run函数就会调用sourceSelector生成新props，并
             * 挂载到selector上 */
            initSelector() {
                const store = this.store;
                const sourceSelector = selectorFactory(store.dispatch, selectorFactoryOptions);

                this.selector = new Selector(sourceSelector, store);
                this.selector.run(this.props);
            }

            onStateChange() {
                const selector = this.selector;
                selector.run(this.props);

                if (selector.shouldComponentUpdate)
                    this.setState(dummyState);
            }

            // 以下几个生命周期函数中的处理，基本与源码同
            componentDidMount() {
                const selector = this.selector;
                selector.run(this.props);

                if (selector.shouldComponentUpdate)
                    this.forceUpdate();
            }

            componentWillReceiveProps(nextProps) {
                this.selector.run(nextProps);
            }

            shouldComponentUpdate() {
                return this.selector.shouldComponentUpdate;
            }

            componentWillUnmount() {
                if (this.unsubscribe) {
                    this.unsubscribe();
                    this.unsubscribe = null;
                }

                const selector = this.selector;
                this.store = null;
                selector.run = noop;
                selector.shouldComponentUpdate = false;
            }

            render() {
                const selector = this.selector;
                selector.shouldComponentUpdate = false;

                return createElement(WrappedComponent, selector.props);
            }
        }

        return Connect;
    }
}

// 源码中对于mapStateToProps, mapDispatchToProps, mergeProps还需要用factory，wrap等函数进行处理，这里就简化，直接自己定义
function defaultMergeProps(stateProps, dispatchProps, ownProps) {
    return { ...ownProps, ...stateProps, ...dispatchProps };
}

function defaultMapToProps(stateOrDispatch) {
    return {};
}

// 给mapStateToProps,mapDispatchToProps函数定义dependsOnOwnProps，即是否依赖ownProps，该值在sourceSelector处理state和props时会用到
function setDependsOnOwnProps(mapToProps) {
    /* 当未定义时，就根据函数的length属性(表示传入的参数的个数)来判断其值
     * 1. 参数个数为0，如 mapStateToProps(...args)，无法判断是否依赖，就默认其依赖
     * 2. 参数个数为1，即 mapStateToProps(state), mapDispatchToProps(dispatch)，此时不依赖ownProps
     * 3. 参数个数为2，即 mapStateToProps(state, ownProps), mapDispatchToProps(dispatch, ownProps)，依赖
     *
     * 所以由以上情况知，当length === 1时，不依赖，length === 0 || 2时，依赖 */
    if (typeof mapToProps.dependsOnOwnProps === undefined)
        mapToProps.dependsOnOwnProps = mapToProps.length !== 1;
}

// 简化了selectorFactory，处理state和props变化的核心代码都与源码相同
function selectorFactory(dispatch, selectorFactoryOptions) {
    // selectorFactoryOptions最主要的就是传入了生成新props所需的mapStateToProps, mapDispatchToProps, mergeProps函数
    const { mapStateToProps, mapDispatchToProps, mergeProps } = selectorFactoryOptions;
    let hasRunAtLeastOnce = false;
    let state, ownProps, stateProps, dispatchProps, mergedProps;

    function handleFirstCall(firstState, firstOwnProps) { // 第一次调用进这里，初始化上面的state等所有变量
        state = firstState;
        ownProps = firstOwnProps;
        stateProps = mapStateToProps(state, ownProps);
        dispatchProps = mapDispatchToProps(dispatch, ownProps);
        mergedProps = mergeProps(stateProps, dispatchProps, ownProps);

        hasRunAtLeastOnce = true;

        return mergedProps;
    }

    // 第二次进这里，根据state和props新旧比较情况来分别处理，具体见selectorFactory.js中源码注释
    function handleSubsequentCalls(nextState, nextOwnProps) {
        const propsChanged = !shallowEqual(ownProps, nextOwnProps);
        const stateChanged = !strictEqual(state, nextState);
        state = nextState;
        ownProps = nextOwnProps;

        if (propsChanged && stateChanged)
            return handleNewPropsAndNewState();
        if (propsChanged)
            return handleNewProps();
        if (stateChanged)
            return handleNewState();

        return mergedProps;
    }

    function handleNewPropsAndNewState() {
        stateProps = mapStateToProps(state, ownProps);

        if (mapDispatchToProps.dependsOnOwnProps)
            dispatchProps = mapDispatchToProps(dispatch, ownProps);

        mergedProps = mergeProps(stateProps, dispatchProps, ownProps);

        return mergedProps;
    }

    function handleNewProps() {
        if (mapStateToProps.dependsOnOwnProps)
            stateProps = mapStateToProps(state, ownProps);

        if (mapDispatchToProps.dependsOnOwnProps)
            dispatchProps = mapDispatchToProps(dispatch, ownProps);

        mergedProps = mergeProps(stateProps, dispatchProps, ownProps);

        return mergedProps;
    }

    function handleNewState() {
        const nextStateProps = mapStateToProps(state, ownProps);
        const statePropsChanged = !shallowEqual(stateProps, nextStateProps);

        stateProps = nextStateProps;

        if (statePropsChanged)
            mergedProps = mergeProps(stateProps, dispatchProps, ownProps);

        return mergedProps;
    }

    return function (nextState, nextOwnProps) { // 该返回函数即为上面的sourceSelector
        return hasRunAtLeastOnce ? handleSubsequentCalls(nextState, nextOwnProps) : handleFirstCall(nextState, nextOwnProps);
    };
}

function shallowEqual(obj1, obj2) {  // 浅相等，即当两个对象不同时，比较其键值，键值为对象，直接比较地址，不再递归比较键值
    if (obj1 === obj2)
        return true;

    if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null)
        return false;

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length)
        return false;

    for (let i = 0; i < keys1.length; i++) {
        let key = keys1[i];
        if (!obj2.hasOwnProperty(key) || obj1[key] !== obj2[key])
            return false;
    }

    return true;
}

// 严格相等，即全等，若为对象，则指向同一个对象才认为相等，当然这里并未处理NaN与NaN不相等，以及+0与-0相等的特殊情况
function strictEqual(obj1, obj2) {
    return obj1 === obj2;
}