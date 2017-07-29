function A(props) {
    return createElement(B, { a: props.a });
}

class B extends Component {
    render() {
        const a = this.props.a;
        let children = null;
        if (!a)
            children = [createElement('span'), createElement(C, { b: a })];
        else
            children = [createElement('span'), createElement(C, { b: a })];
        return createElement('div', { a, children });
    }
}

function C(props) {
    return createElement(D, { b: props.b });
}

class D extends Component {
    render() {
        const b = this.props.b;
        if (!b)
            return createElement('h3');
        else
            return createElement('p');
    }
}

const containerNode = document.getElementById('root');

mountTree(createElement(A, { a: 0 }), containerNode);

setTimeout(() => {
    mountTree(createElement(A, { a: 1 }), containerNode);
}, 3000);