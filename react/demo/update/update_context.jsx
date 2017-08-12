import { Component } from 'react';
import { render } from 'react-dom';
import PropTypes from 'prop-types';

class A extends Component {
    static childContextTypes = { a: PropTypes.number };

    constructor(props) {
        super(props);
        this.state = {};

        this.handleClick = this.handleClick.bind(this);
    }

    getChildContext() {
        return { a: 0 };
    }

    componentWillReceiveProps(nextProps) {
        console.log('A willReceiveProps');
    }

    shouldComponentUpdate(nextProps) {
        console.log('A shouldComponentUpdate');
        return true;
    }

    componentWillUpdate(nextProps) {
        console.log('A willUpdate');
    }

    componentDidUpdate(nextProps) {
        console.log('A didUpdate');
    }

    handleClick(ev) {
        this.setState({});
    }

    render() {
        return (
            <div>
                <p onClick={this.handleClick}>A</p>
                {this.props.children}
            </div>
        );
    }
}

class B extends Component {
    static contextTypes = { a: PropTypes.number }; //这行没有也可以

    constructor(props) {
        super(props);
        this.state = {};

        this.handleClick = this.handleClick.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        console.log('B willReceiveProps');
    }

    shouldComponentUpdate(nextProps) {
        console.log('B shouldComponentUpdate');
        return true;
    }

    componentWillUpdate(nextProps) {
        console.log('B willUpdate');
    }

    componentDidUpdate(nextProps) {
        console.log('B didUpdate');
    }

    handleClick(ev) {
        this.setState({});
    }

    render() {
        return <p onClick={this.handleClick}>B</p>;
    }
}

// 直接返回B本来就能层层往下传导更新，所以此处用children，因为children是不行的，而加了context之后，就变的可以层层往下更新了
render(<A><B/></A>,document.getElementById('root'));