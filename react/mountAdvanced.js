function mountComposite(element) {
    const type = element.type;
    const props = element.props;

    let renderdElement = null;

    if (isClass(type)) {
        const publicInstance = new type(props);
        publicInstance.props = props;

        if (publicInstance.componentWillMount)
            publicInstance.componentWillMount();

        renderedElement = publicInstance.render();
    } else if (typeof type === 'function')
        renderedElement = type(props);

    return mount(renderedElement);
}

function mountHost(element) {
    const type = element.type;
    const props = element.props;
    let children = props.children || [];

    if (!Array.isArray(children))
        children = [children];
    children = children.filter(Boolean);

    const node = document.createElement(type);
    Object.keys(props).forEach(propName => {
        if (propName !== 'children')
            node.setAttribute(propName, props[propName]);
    });

    children.forEach(childElement => {
        let childNode = mount(childElement);
        node.appendChild(childNode);
    });

    return node;
}

function mount(element) {
    const type = element.type;
    if (typeof type === 'function')
        return mountComposite(element);
    else if (typeof type === 'string')
        return mountHost(element)
}

const rootEl = document.getElementById('root');
const node = mount({ type: App, props: props }); //<App />
rootEl.appendChild(node);