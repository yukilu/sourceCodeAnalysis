import { Component } from 'react';
import { render } from 'react-dom';
import { Provider, connect } from 'react-redux';
import { BrowserRouter as Router, Route, Link, withRouter } from 'react-router-dom';

import Counter from './components/Count';
import { store, mapStateToProps, mapDispatchToProps } from './store/countStore';

// 这里，connect的位置处于Router与Route之间，且withRouter并未直接作用于connected组件上，中间加了一层组件，withRouter失效
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

const ConnectedWrap = connect(mapStateToProps, mapDispatchToProps)(Wrap);
// const ConnectedWrap = withRouter(connect(mapStateToProps, mapDispatchToProps)(Wrap));  正确做法，直接作用于connected组件上

// 在connected的组件ConnectedWrap与withRouter的组件之间添加一个组件WrapAgain，即withRouter并非直接作用于connected组件上
// 这样使withRouter作用失效，说明withRouter必须直接作用于connected组件上
function WrapAgain(props) {
    return <ConnectedWrap />;
}

const ConnectedWrapAgain = withRouter(WrapAgain);

render(
    <Provider store={store}>
        <Router>
            <ConnectedWrapAgain />
        </Router>
    </Provider>,
    document.getElementById('root')
);