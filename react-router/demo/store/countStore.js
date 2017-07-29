import { createStore } from 'redux';

const actions = {
    increase: () => ({ type: 'INCREASE' }),
    decrease: () => ({ type: 'DECREASE' })
};

function reducer(state={ count: 0 }, action) {
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

export const store = createStore(reducer);

export function mapStateToProps(state) {
    return { count: state.count };
}

export function mapDispatchToProps(dispatch) {
    return {
        increase: () => dispatch(actions.increase()),
        decrease: () => dispatch(actions.decrease())
    };
}