import { Component } from 'react';
import { render } from 'react-dom';
import { BrowserRouter as Router, Route, Link } from 'react-router-dom';

// Route中不存在component和render时，只有children，这时候，不论path值，children总是会被渲染
// children为函数
render(
    <Router>
        <div>
            <ul>
                <li><Link to='/'>Home</Link></li>
                <li><Link to='/a'>A</Link></li>
            </ul>
            <hr/>

            <Route exact path='/' render={props => <h2>Home</h2>} />
            <Route path='/a' children={props => <p>A</p>} />
        </div>
    </Router>,
    document.getElementById('root')
);

// children为Route子组件 <Route><A/></Route>
function A(props) {
    return <p>A</p>;
}

render(
    <Router>
        <div>
            <ul>
                <li><Link to='/'>Home</Link></li>
                <li><Link to='/a'>A</Link></li>
            </ul>
            <hr/>

            <Route exact path='/' render={props => <h2>Home</h2>} />
            <Route path='/a'><A/></Route>
        </div>
    </Router>,
    document.getElementById('root')
);