import { Component } from 'react';
import { render } from 'react-dom';
import PropTypes from 'prop-types';

/* Pa，Pb各有一个往下传的context，结构为<Pa><Pb><A/></Pb></Pa>，Pb的context并不会整体上覆盖Pa的context，只有同名元素会覆盖
 * Pa -> { a: 0, s: 'a' }  Pb -> { b: 1, s: 'b' }    A中访问时 { ...Pa.childContext, ...Pb.childContext }
 * 如下代码中，Pa，Pb的子元素A能访问Pa，Pb中挂载的context，看起来效果如上，两个context被融合了
 * 不同名元素在A.context中都能访问，如a, b，同名元素则会后面的覆盖前面的，如其中的s元素
 * 下面代码渲染结果为 0  1  b
 */ 
class Pa extends Component {
    static childContextTypes = {
        a: PropTypes.number,
        s: PropTypes.string
    };

    getChildContext() {
        return { a: 0, s: 'a' };
    }

    render() {
        return this.props.children;
    }
}

class Pb extends Component {
    static childContextTypes = {
        b: PropTypes.number,
        s: PropTypes.string
    };

    getChildContext() {
        return { b: 1, s: 'b' };
    }

    render() {
        return this.props.children;
    }
}

class A extends Component {
    static contextTypes = {
        a: PropTypes.number,
        b: PropTypes.number,
        s: PropTypes.string
    };

    render() {
        return <div><p>{this.context.a}</p><p>{this.context.b}</p><p>{this.context.s}</p></div>;
    }
}

render(<Pa><Pb><A/></Pb></Pa>, document.getElementById('root'));