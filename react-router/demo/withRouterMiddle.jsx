import { Component } from 'react';
import { render } from 'react-dom';
import { Provider, connect } from 'react-redux';
import { BrowserRouter as Router, Route, Link, withRouter } from 'react-router-dom';

import Counter from './components/Count';
import { store, mapStateToProps, mapDispatchToProps } from './store/countStore';

// connect位于Router与Route中间时，会影响，需要用withRouter对connected组件进行强制刷新
function Wrap(props) {
     const { count, increase, decrease } = props;
     return (
        <div>
            <ul>
                <li><Link to='/'>Home</Link></li>
                <li><Link to='/c'>Counter</Link></li>
            </ul>
            <hr/>

            <Route exact path='/' render={() => <h2>Home</h2>} />
            <Route path='/c' render={() => <Counter count={count} increase={increase} decrease={decrease} />} />
       </div>
    );
}

//用注释掉的代码时，路由无法正常工作，即连接后由于connect机制问题，无法刷新，需要用下面正确的代码，withRouter函数包装后强制刷新
// const ConnectedWrap = connect(mapStateToProps, mapDispatchToProps)(Wrap);
const ConnectedWrap = withRouter(connect(mapStateToProps, mapDispatchToProps)(Wrap));

/* connect位于Router和Route中间时，由于connect包裹了Route，Provider总在Route前，所以Provider有如下两种位置，
 * 在Router前和在Router后，两者皆可，基于以下原理，无影响
 * Provider的两个作用: 1.传入store，并挂载到context传递给子组件  2.渲染唯一子组件->渲染connected组件->渲染原组件
 * Router的作用: 形成Router组件树，当点击Link，改变history路径，触发history监听函数，根据新路径Router组件调用setState({match})，
 * 从而重新渲染Router组件树，Route也根据具体路径重新渲染对应组件
 */

// Provider -> Router -> connect -> Route 
render(
    <Provider store={store}>
        <Router>
            <ConnectedWrap />
        </Router>
    </Provider>,
    document.getElementById('root')
);

// Router -> Provider -> connect -> Route
render(
    <Router>
        <Provider store={store}>
            <ConnectedWrap />
        </Provider>
    </Router>,
    document.getElementById('root')
);