import { Component } from 'react';
import { render } from 'react-dom';
import { createStore, applyMiddleware, bindActionCreators } from 'redux';
import { Provider, connect } from 'react-redux';

/* 这个示例是为了说明异步dispatch(action)的
 * 1. 用异步中间件如thunk可以dispatch函数，在函数中封装异步逻辑，实现在需要的时候异步dispatch(action)
 * 2. 异步中间件不是必须的，因为自己可以实现异步dispatch(action)的操作
 *
 * 示例代码如下
 * dispatch((dispatch, getState) => {
 *     setTimeout(() => dispatch(someAction), 1000);
 * });
 * 效果等同于
 * setTimeout(() => dispatch(someAction), 1000);
 *
 * 但是为什么还要使用thunk中间件来实现dispatch函数
 * 1. 是为了代码更容易维护，将逻辑都封装进actions中，同时操作相同，不论异步同步，都是dispatch(action)
 * 2. 使用redux中的bindActionCreator更方便，都是将actionCreator通过dispatch分发，所以使用bind时无法自己封装逻辑
 * 都只能通过dispatch(action)简单分发，这时候只能将分发的action变为函数，通过thunk中间件实现异步。
 *   function bindActionCreator(actionCreator, dispatch) {
 *       return (...args) => dispatch(actionCreator(...args))
 *   }
 * 3. 将actionCreator与actionCreatorAsync分开，actionCreator返回对象，actionCreatorAsync返回函数
 *    const increase = payload => ({ type: 'INCREASE', payload });
 *    const increaseAsync = payload => (dispatch, getState) => {
 *        getMsg().then(msg => dispatch(increase(payload)), err => console.log(err));
 *    };
 *    bindActionCreator后返回函数
 *    (...args) => dispatch(increase(...args))
 *  ->  payload => dispatch(incease(payload))
 *  ->  payload => dispatch({ type: 'INCREASE', payload })
 *  
 *    (..args) => dispatch(increaseAsync(...args))
 *  ->  payload => dispatch(increaseAsync(payload))
 *  ->  payload => dispatch((dispatch, getState) => {
 *          getMsg().then(msg => dispatch(increase(payload)));
 *      })
 *  ->  payload => dispatch((dispatch, getState) => {
 *          getMsg().then(msg => dispatch({ type: 'INCREASE', payload }));
 *      })
 *  当然实际调用顺序不是这样的，这里只是示意一个异步调用的过程
 */

// 用getMsg模仿后台异步获取数据
function getMsg(url) {
    return new Promise(function(resolve, reject) {
        setTimeout(() => {
            if (!url)
                resolve('GOT');
            else
                resolve(url);
        }, 1000);
    });
}

/* 其实actions中的函数都是actionCreator，actionCreator(arg)返回值为对应的action { type: 'GET', arg: arg }
 * getAsync异步函数也可以不用封装，在下面自己封装了用，但是这样封装在actions中更容易维护
 */
const actions = {
    get: msg => ({ type: 'GET', msg }),
    /* 因为在下面用bindActionCreators处理了整个actionCreators对象
     * 处理过后的 getAsync = (...args) => dispatch(actions.getAsync(...args))
     * 由于下面在标签上 onClick = {getAsync}，所以onClick回调时会调用getAsync(ev)，传入event事件对象
     * ...args应为ev，getAsync = ev => dispatch(actions.getAsync(ev))
     * 所以在actions.getAsync中传入的参数也为event对象
     */
    getAsync: ev => (dispatch, getState) => {
        getMsg(ev && ev.target.innerHTML).then(msg => {
            dispatch(actions.get(msg));
        }, err => {
            console.log(err);
        });
    }
}

function reducer(state = { msg: '' }, action) {
    switch (action.type) {
        case 'GET':
            return { msg: action.msg };
        default:
            return state;
    }
}

const thunk = ({ dispatch, getState }) => next => action => typeof action === 'function' ? action(dispatch, getState) : next(action);
const logger = ({ dispatch, getState }) => next => action => { next(action); console.log(getState()); };
const store = createStore(reducer, applyMiddleware(thunk, logger));

const { dispatch } = store;

dispatch(actions.get('Pretty'));
dispatch(actions.getAsync());

// 当然上面的异步也可以直接用下面的代码实现
getMsg().then(msg => {
    dispatch(actions.get(msg));
}, err => {
    console.log(err);
});

// 当需要调用bindActionCreators生成函数时
function mapStateToProps(state) {
    return { msg: state.msg };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators(actions, dispatch);

 /* return {
  *   get: msg => { dispatch(actions.get(msg)); },
  *   getAsync: ev => { dispatch(actions.getAsync(ev)); }
  * };
  *
  * return {
  *   get: msg => dispatch(actions.get(msg)),
  *   // 可以减少一层dispatch(fn)，直接执行以下代码
  *   getAsync: ev => {
  *     getMsg(ev && ev.target.innerHTML).then(msg => {
            dispatch(actions.get(msg));
        }, err => {
            console.log(err);
        });
  *   }
  * };
  */
}

@connect(mapStateToProps, mapDispatchToProps)
class Message extends Component {
    render() {
        const { msg, getAsync } = this.props;
        return (    // 点击后1s将msg值变为innerHTML
            <div>
                <p>{msg}</p>
                <button onClick={getAsync}>0</button><br/>
                <button onClick={getAsync}>1</button><br/>
                <button onClick={getAsync}>2</button>
            </div>
        );
    }
}

render(
    <Provider store={store}>
        <Message />
    </Provider>,
    document.getElementById('root')
);