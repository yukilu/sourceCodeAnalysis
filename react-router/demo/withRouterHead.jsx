import { Component } from 'react';
import { render } from 'react-dom';
import { Provider, connect } from 'react-redux';
import { BrowserRouter as Router, Route, Link, withRouter } from 'react-router-dom';

import Counter from './components/Count';
import { store, mapStateToProps, mapDispatchToProps } from './store/countStore';

/* connect在Router之前，无影响，即connect包裹的组件已经包含了整个Router组件树，所以Route的重新渲染不会受到connect的影响
 * Provider -> connect -> Router -> Route
 * 只要没有connect在Router和Route中间就不会影响重新渲染Router组件树时Route的重新渲染
 */
function Wrap(props) {
     const { count, increase, decrease } = props;
     return (
        <Router>
            <div>
                <ul>
                    <li><Link to='/'>Home</Link></li>
                    <li><Link to='/c'>Counter</Link></li>
                </ul>
                <hr/>

                <Route exact path='/' render={() => <h2>Home</h2>} />
                <Route path='/c' render={() => <Counter count={count} increase={increase} decrease={decrease} />} />
            </div>
        </Router>
    );
}

const ConnectedWrap = connect(mapStateToProps, mapDispatchToProps)(Wrap);

// Rrovider只有一种情况，就是在最外面
render(
    <Provider store={store}>
        <ConnectedWrap />
    </Provider>,
    document.getElementById('root')
);