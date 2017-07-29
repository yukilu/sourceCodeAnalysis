function createElement(type, props) {
    if (!props)
        props = {};

    return { type, props };
}

class Component { }
Component.isClass = true;

function instantiateComponent(element) {
    const type = element.type;
    if (typeof type === 'function')
        return new CompositeComponent(element);
    else if (typeof type === 'string')
        return new DOMComponent(element);
}


function isClass(type) {
    if (typeof type === 'function' && type.isClass)
        return true;
    return false;
}

class CompositeComponent {
    constructor(element) {
        this.currentElement = element;
        this.renderedComponent = null;
        this.publicInstance = null;
    }

    mount() {
        const element = this.currentElement;
        const type = element.type;
        const props = element.props;

        let publicInstance = null;
        let renderedElement = null;
        let renderedComponent = null;

        if (isClass(type)) {
            publicInstance = new type(props);
            publicInstance.props = props;
            renderedElement = publicInstance.render();
        } else if (typeof type === 'function')
            renderedElement = type(props);

        renderedComponent = instantiateComponent(renderedElement);
        this.pulicInstance = publicInstance;
        this.renderedComponent = renderedComponent;

        return renderedComponent.mount();
    }

}

class DOMComponent {
    constructor(element) {
        this.currentElement = element;
        this.childComponents = null;
        this.node = null;
    }

    mount() {
        const element = this.currentElement;
        const type = element.type;
        const props = element.props;
        let children = props.children;

        let childComponents = null;
        let childNodes = null;

        const node = document.createElement(type);
        this.node = node;

        Object.keys(props).forEach(propName => {
            if (propName !== 'children')
                node.setAttribute(propName, props[propName]);
        });

        if (!children)
            children = [];

        if (!Array.isArray(children))
            children = [children];

        childComponents = children.map(instantiateComponent);
        this.childComponents = childComponents;

        childNodes = childComponents.map(childComponent => childComponent.mount());
        childNodes.map(childNode => {
            node.appendChild(childNode);
        });

        return node;
    }
}

function mountTree(element, containerNode) {
    const rootComponent = instantiateComponent(element);
    const rootNode = rootComponent.mount();
    console.log(rootComponent);

    containerNode.appendChild(rootNode);
}