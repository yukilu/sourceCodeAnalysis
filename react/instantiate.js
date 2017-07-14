function instantiateComponent(element) {
    const type = element.type;
    if (typeof type === 'function')
        return new CompositeComponent(element);
    else if (typeof type === 'string')
        return new DOMComponent(element);
}

class CompositeComponent {
    constructor(element) {
        this.currentElement = element;
        this.renderedComponent = null;
        this.publicInstance = null;
    }

    getPublicInstance() {
        return this.publicInstance;
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
            if (publicInstance.componentWillMount)
                publicInstance.componentWillMount();
            renderedElement = publicInstance.render();
        }
        else if (typeof type === 'function')
            renderedElement = type(props);

        this.publicInstance = publicInstance;
        renderedComponent = instantiateComponent(renderedElement)
        this.renderedComponent = renderedComponent;

        return renderedComponent.mount();
    }

    unmount() {
        const publicInstance = this.publicInstance;
        if (publicInstance.componentWillUnmount)
            publicInstance.componentWillUnmount();

        const renderedComponent = this.renderedComponent;
        renderedComponent.unmount();
    }

    getHostNode() {
        return this.renderedComponent.getHostNode();
    }

    receive(nextElement) {
        const prevProps = this.currentElement.props;
        const publicInstance = this.publicInstance;
        const prevRenderedComponent = this.renderedComponent;
        const prevRenderedElement = this.renderedComponent.currentElement;

        this.currentElement = nextElement;
        const type = nextElement.type;
        const nextProps = nextElement.props;

        let nextRenderedElement = null;
        if (isClass(type)) {
            if (publicInstance.componentWillUpdate)
                publicInstance.componentWillUpdate(nextProps);
            publicInstance.props = nextProps;
            nextRenderedElement = publicInstance.render();
        } else if (typeof type === 'function')
            nextRenderedElement = type(nextProps);

        if (prevRenderedElement.type === nextRenderedElement.type) {
            prevRenderedComponent.receive(nextRenderedElement);
            return;
        }

        const prevNode = prevRenderedComponent.getHostNode();

        prevRenderedComponent.unmount();
        const nextRenderedComponent = instantiateComponent(nextRenderedElement);
        const nextNode = nextRenderedComponent.mount();

        this.renderedComponent = nextRenderedComponent;

        prevNode.parentNode.replaceChild(nextNode, prevNode);
    }
}

class DOMComponent {
    constructor(element) {
        this.currentElement = element;
        this.renderedChildren = null;
        this.node = null;
    }

    getPublicInstance() {
        return this.node;
    }

    mount() {
        const element = this.currentElement;
        const type = element.type;
        const props = element.props;
        let children = props.children || [];

        let renderedComponentChildren = null;
        let childNodes = null;

        if (!Array.isArray(children))
            children = [children];

        const node = document.createElement(type);
        this.node = node;

        Object.keys(props).forEach(propName => {
            if (propName !== 'children')
                node.setAttribute(propName, props[propName]);
        });

        renderedComponentChildren = children.map(instantiateComponent);
        this.renderedChildren = renderedComponentChildren;
        childNodes = renderedComponentChildren.map(componentChild => {
            let childNode = componentChild.mount();
            componentChild.node = childNode;
            return childNode;
        });
        this.childNodes = childNodes;
        childNodes.forEach(childNode => {
            node.appendChild(childNode);
        });

        return node;
    }

    unmount() {
        const renderedComponentChildren = this.renderedChildren;
        renderedComponentChildren.forEach(componentChild => {
            componentChild.unmount();
        });
    }

    getHostNode() {
        return this.node;
    }

    receive(nextElement) {
        const node = this.node;
        const prevElement = this.currentElement;
        const prevProps = prevElement.props;
        const nextProps = nextElement.props;
        this.currentElement = nextElement;

        Object.keys(prevPorps).forEach(propName => {
            if (propName !== 'children' && !nextProps.hasOwnProperty(propName))
                node.removeAttribute(propName);
        });

        Object.keys(nextProps).forEach(propName => {
            if (propName !== 'children')
                node.setAttribute(propName, nextProps[propName]);
        });

        let prevChildren = prevProps.children || [];
        if (!Array.isArray(prevChildren))
            prevChildren = [prevChildren];
        let nextChildren = nextProps.children || [];
        if (!Array.isArray(nextChildren))
            nextChildren = [nextChildren];

        const prevComponentRenderedChildren = this.renderedChildren;
        const nextComponentRenderedChildren = [];

        const operationQueue = [];

        for (let i = 0; i < nextChildren.length; i++) {
            let prevComponentChild = prevComponentRenderedChildren[i];
            let nextComponentChild = null;

            if (!prevChild) {
                nextComponentChild = instantiateComponent(nextChildren[i]);
                let node = nextComponentChild.mount();

                operationQueue.push({ type: 'ADD', node });
                nextComponentRenderedChildren.push(nextComponentChild);
                continue;
            }

            let canUpdate = prevChildren[i].type === nextChildren[i].type;

            if (!canUpdate) {
                let prevNode = prevComponentChild.node;
                prevComponentChild.unmount();

                nextComponentChild = instantiateComponent(nextChildren[i]);
                let nextNode = nextComponentChild.mount();

                operationQueue.push({ type: 'REPLACE', prevNode, nextNode });
                nextRenderedChildren.push(nextChild);
                continue;
            }

            prevComponentChild.receive(nextChildren[i]);
            nextComponentRenderedChildren.push(prevComponentChild);
        }

        for (let i = nextChildren.length; i < prevChildren.length; i++) {
            let prevComponentChild = prevComponentRenderedChildren[i];
            let node = prevComponentChild.node;
            prevComponentChild.unmount();

            operationQueue.push({ type: 'REMOVE', node });
        }

        this.renderedChildren = nextComponentRenderedChildren;

        while (operationQueue.length > 0) {
            let operation = operationQueue.shift();
            switch (operation.type) {
                case 'ADD':
                    this.node.appendChild(operation.node);
                    break;
                case 'REPLACE':
                    this.node.replaceChild(operation.nextNode, operation.prevNode);
                    break;
                case 'REMOVE':
                    this.node.removeChild(operation.node);
                    break;
            }
        }
    }
}

function mountTree(element, containerNode) {
    if (containerNode.firstChild) {
        const prevNode = containerNode.firstChild;
        const prevRootComponent = prevNode._internalInstance;
        const prevElement = prevRootComponent.currentElement;

        if (prevElement.type === element.type) {
            prevRootComponent.receive(element);
            return;
        }

        unmountTree(containerNode);
    }

    const rootComponent = instantiateComponent(element);
    const node = rootComponent.mount();
    node._internalInstance = rootComponent;
    containerNode.appendChild(node);

    const publicInstance = rootComponent.getPublicInstance();
    return publicInstance;
}

function unmountTree(containerNode) {
    const node = containerNode.firstChild;
    const rootComponent = node._internalInstance;

    rootComponent.unmount();
    containerNode.innerHTML = ''; 
}