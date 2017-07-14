function isClass(type) {
    return Boolean(type.prototype) && Boolean(type.prototype.isReactComponent);
}

function mount(element) {
    let type = element.type;
    let props = element.props;
    let renderedElement = null;

    if (isClass(type)) {
        let pubicInstance = new type(props);
        publicInstance.props = props;
        if (publicInstance.componentWillMout)
            publicInstance.componentWillMount();

        renderedElement = publicInstance.render();
    }
    else
        renderedElement = type(props);

    return mount(renderedElement);
}

const rootEl = document.getElementById('root');
const node = mount({ type: App, props: props }); //<App />
rootEl.appendChild(node);