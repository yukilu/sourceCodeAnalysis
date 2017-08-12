import { Component } from 'react';
import { render } from 'react-dom';

/* 与receive.jsx同，并且这里更进一步，下层组件并没有传props，但是还是会调用update相关生命周期函数
 * 组件树过大时，就会带来性能问题
 */
class A extends Component {
    constructor(props) {
        super(props);
        this.state = { a: 0 };

        this.handleClick = this.handleClick.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        console.log('A.receive ', nextProps);
    }

    shouldComponentUpdate(nextProps) {
        console.log('A.shouldComponentUpdate = true ', nextProps);
        return true;
    }

    componentWillUpdate(nextProps) {
        console.log('A.componentWillUpdate', nextProps);
    }

    componentDidUpdate(nextProps) {
        console.log('A.componentDidUpdate', nextProps);
    }

    handleClick(ev) {
        this.setState({ a: 0 });
    }

    render() {
        const { a } = this.state;
        return <div onClick={this.handleClick}><p>{`A.a = ${a}`}</p><B /></div>;
    }
}

class B extends Component {
    componentWillReceiveProps(nextProps) {
        console.log('B.receive ', nextProps);
    }

    shouldComponentUpdate(nextProps) {
        // console.log('B.shouldComponentUpdate = false', nextProps);
        // return false;
        console.log('B.shouldComponentUpdate = true', nextProps);
        return true;
    }

    componentWillUpdate(nextProps) {
        console.log('B.componentWillUpdate', nextProps);
    }

    componentDidUpdate(nextProps) {
        console.log('B.componentDidUpdate', nextProps);
    }

    render() {
        return <div><p>B</p><C /></div>;
    }
}

class C extends Component {
    componentWillReceiveProps(nextProps) {
        console.log('C.receive ', nextProps);
    }

    shouldComponentUpdate(nextProps) {
        console.log('C.shouldComponentUpdate = true ', nextProps);
        return true;
    }

    componentWillUpdate(nextProps) {
        console.log('C.componentWillUpdate ', nextProps);
    }

    componentDidUpdate(nextProps) {
        console.log('C.componentDidUpdate ', nextProps);
    }

    render() {
        return <p>C</p>;
    }
}

render(<A />, document.getElementById('root'));