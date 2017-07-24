import { createStore, applyMiddleware } from 'redux';

function reducer(state={ count: 0 }, action) {
    const count = state.count;
    switch (action.type) {
        case 'ADD':
            return { count: count + 1 };
        case 'REMOVE':
            return { count: count - 1 };
        default:
            return state;
    }
}

const thunk = ({ dispatch, getState }) => next => action => typeof action === 'function' ? action(dispatch, getState) : next(action);
const logger = store => next => action => { next(action); console.log(store.getState()); };

const store = createStore(reducer, applyMiddleware(thunk, logger));

function listener() {
    console.log(store.getState());
}

const { dispatch,  getState } = store;

const actions = {
    addCreator: () => ({ type: 'ADD' }),
    removeCreator: () => ({ type: 'REMOVE' })
};

dispatch(actions.addCreator());
dispatch(actions.addCreator());
dispatch(actions.removeCreator());
dispatch((dispatch, getState) => {
    setTimeout(() => {
        dispatch(actions.removeCreator());
    }, 2000);
});