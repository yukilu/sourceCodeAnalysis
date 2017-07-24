import { createStore, applyMiddleware } from 'redux';

const thunk = ({ disptach, getState }) => next => action => typeof action === 'function' ? action(dispatch, getState) : next(action);

export const actions = {
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

export function mapStateToProps(state) {
    return { count: state.count };
}

export function mapDispatchToProps(dispatch) {
    return {
        increase: () => dispatch(actions.increase()),
        decrease: () => dispatch(actions.decrease())
    };
}

export const store = createStore(reducer, applyMiddleware(thunk));

export const anotherStore = createStore(reducer, applyMiddleware(thunk));