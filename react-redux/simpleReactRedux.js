import { Component, Children } from 'react';
import PropTypes from 'prop-types';

export class Provider extends Component {
    static childContextTypes = { store: PropTypes.object };

    getChildContext() {
        return { store: this.props.store };
    }

    render() {
        return Children.only(this.props.children);
    }
}

const dummyState = {};

function noop() {}

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

function defaultMergeProps(stateProps, dispatchProps, ownProps) {
    return { ...stateProps, ...dispatchProps, ...ownProps };
}

function defaultMapToProps(stateOrDispatch) {
    return {};
}

function setDependsOnOwnProps(mapToProps) {
    mapToProps.dependsOnOwnProps = mapToProps.length !== 1; 
}

function selectorFactory(dispatch, selectorFactoryOptions) {
    const { mapStateToProps, mapDispatchToProps, mergeProps } = selectorFactoryOptions;
    let hasRunAtLeastOnce = false;
    let state, ownProps, stateProps, dispatchProps, mergedProps;

    function handleFirstCall(firstState, firstOwnProps) {
        state = firstState;
        ownProps = firstOwnProps;
        stateProps = mapStateToProps(state, ownProps);
        dispatchProps = mapDispatchToProps(dispatch, ownProps);
        mergedProps = mergeProps(stateProps, dispatchProps, ownProps);

        hasRunAtLeastOnce = true;

        return mergedProps;
    }

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

        if (!shallowEqual(stateProps, nextStateProps))
            mergedProps = mergeProps(stateProps, dispatchProps, ownProps);

        stateProps = nextStateProps;

        return mergedProps;
    }

    return function (nextState, nextOwnProps) {
        return hasRunAtLeastOnce ? handleSubsequentCalls(nextState, nextOwnProps) : handleFirstCall(nextState, nextOwnProps);
    };
}

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

                this.unsubscribe = store.subscribe(this.onStateChange.bind(this));
                this.initSelector();
            }

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

function shallowEqual(obj1, obj2) {
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

function strictEqual(obj1, obj2) {
    return obj1 === obj2;
}