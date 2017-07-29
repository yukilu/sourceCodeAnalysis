import { Component } from 'react';
import { render } from 'react-dom';
import PropTypes from 'prop-types';

/* A中设置了childContext，B,C为其子组件，想在B(普通函数)和C(class)中使用context，类中已知可以使用，其实普通函数中也可使用
 * 类中，只需要设置一个静态变量contextTypes即可，而类其实也是函数，所以其实普通函数也可以使用context，只需要也在B上挂载一
 * 个静态变量contextTypes就可以了，若不设置contextTypes，context也可以访问，但是为空
 */
class A extends Component {
    static childContextTypes = {
        a: PropTypes.number
    };

    getChildContext() {
        return { a: 0 };
    }

    render() {
        return <div><B /><C /></div>;
    }
}

// 普通函数时候，第一个参数是props，第二个就是context
function B(props, context) {
    console.log(context);
    return <div>{context.a}</div>;
}

// 在普通函数上挂载静态变量contextTypes，即可在函数中的context中访问到所需变量
B.contextTypes = { a: PropTypes.number };

/* 类中用法已熟悉，挂载contextTypes静态变量，其实本质上也是挂载到函数C上，与上面普通函数相同
 * 不同的地方在于构造函数中第二个参数使context，同时context也被挂载到this上，可通过this.context直接访问
 */
class C extends Component {
    static contextTypes = { a: PropTypes.number };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        console.log(this.context);
        return <p>{this.context.a}</p>;
    }
}

render(<A />, document.getElementById('root'));