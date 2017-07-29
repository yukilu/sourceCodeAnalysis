import { Component } from 'react';
import { render } from 'react-dom';
import { Provider, connect } from 'react-redux';
import { BrowserRouter as Router, Route, Link, withRouter } from 'react-router-dom';

import Counter from './components/Count';
import { store, mapStateToProps, mapDispatchToProps } from './store/countStore';

/* connect位于Route之后，无影响，即connected组件为Route中component属性值
 * Router -> Route -> connect
 * Provider位置有3种情况，无影响
 * Provider -> Router -> Route -> connect || Router -> Provider -> Route -> connect || Router -> Route -> Provider -> connect
 * 只要没有connect在Router和Route中间就不会影响重新渲染Router组件树时Route的重新渲染
 */
const ConnectedCounter = connect(mapStateToProps, mapDispatchToProps)(Counter);

function Wrap(props) {
     return (
        <div>
            <ul>
                <li><Link to='/'>Home</Link></li>
                <li><Link to='/c'>Counter</Link></li>
            </ul>
            <hr/>

            <Route exact path='/' render={() => <h2>Home</h2>} />
            <Route path='/c' component={ConnectedCounter} />
        </div>
    );
}

// Provider位置有三种情况，都成立，没影响
// 1. 在Router的上层  Provider -> Router -> Route -> connect
render(
    <Provider store={store}>
        <Router>
            <Wrap />
        </Router>
    </Provider>,
    document.getElementById('root')
);

// 2. 在Router与Route之间  Router -> Provider -> Route -> connect
render(
    <Router>
        <Provider store={store}>       
            <Wrap />  
        </Provider>
    </Router>,
    document.getElementById('root')
);

// 3. 在Route之后  Router -> Route -> Provider -> connect
// 用Provider将ConnectedCounter包裹后，然后作为整个component被Route渲染
function PvWrapConnectedCounter(props) {
    return(
        <Provider store={store}>
            <ConnectedCounter />
        </Provider>
    );
}

function WrapRedux(props) {
     return (
        <div>
            <ul>
                <li><Link to='/'>Home</Link></li>
                <li><Link to='/c'>Counter</Link></li>
            </ul>
            <hr/>

            <Route exact path='/' render={() => <h2>Home</h2>} />
            <Route path='/c' component={PvWrapConnectedCounter} />
        </div>
    );
}

render(
    <Router>  
        <WrapRedux />  
    </Router>,
    document.getElementById('root')
);