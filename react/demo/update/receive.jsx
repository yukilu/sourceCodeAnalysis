import { Component } from 'react';
import { render } from 'react-dom';

/* A -> B -> C
 * 在A中setState重新渲染，其中设定的值a不变，仍为0，或者改变为1，发现不论props的值变不变，或者直接没有props值传入时(见recieve_noProps)，
 * 组件都会层层往下更新，涉及到最底下的DOM元素，那DOM元素不会变(不会增删该DOM元素，减少DOM操作)，但attribute值会被重新设置，不论其值是否改变
 * 若shouldComponentUpdate返回值为true，不设置该函数，默认返回true
 * 都会往下层层调用各组件的componentWillReceiveProps，shouldComponentUpdate，componentWillUpdate，componentDidUpdate生命周期函数
 * 若shouldComponentUpdate返回值为false，只调用当前组件的componentWillReceiveProps和shouldComponentUpdate，
 * componentWillUpdate，componentDidUpdate生命周期函数不会被调用，当前组件也不会被更新，并且当前组件的所有下层组件都不会被更新
 *
 * 所以默认时，这些update相关的生命周期函数都会被调用，来重新渲染组件，若组件树过大，而props值实际并未改变多少时，会带来性能问题
 * 所以有时候可以手动设置shouldComponentUpdate的返回值为false来提高性能，但是这样会造成当前组件的所有下层组件无法重新渲染的问题
 *
 * 组件生命周期相关参见 https://facebook.github.io/react/docs/react-component.html
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
        // this.setState({ a: 0 });
        this.setState({ a: 1 });
    }

    render() {
        const { a } = this.state;
        return <div onClick={this.handleClick}><p>{`A.a = ${a}`}</p><B a={a} /></div>;
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
        const { a } = this.props;
        return <div><p>{`B.a = ${a}`}</p><C a={a} /></div>;
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
        return <p>{`C.a = ${this.props.a}`}</p>;
    }
}

render(<A />, document.getElementById('root'));