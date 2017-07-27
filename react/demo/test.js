function A(props) {
    return createElement(B, { a: 0 });
}

class B {
    render() {
        return createElement('div', { a: this.props.a, children: [createElement('span'), createElement('a')] });
    }
}

B.isClass = true;

mountTree(createElement(A), document.getElementById('root'));