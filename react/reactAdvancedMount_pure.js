function createElement(type, props) {
    if (!props)
        props = {};

    return { type, props };
}

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

    getPublicInstance() {
        return this.publicInstance;
    }

    getHostNode() {
        return this.renderedComponent.getHostNode();
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
        } else if (typeof type === 'function') {
            publicInstance = null;
            renderedElement = type(props);
        }

        renderedComponent = instantiateComponent(renderedElement);
        this.pulicInstance = publicInstance;
        this.renderedComponent = renderedComponent;

        return renderedComponent.mount();
    }

    unmount() {
        const publicInstance = this.publicInstance;
        const renderedComponent = this.renderedComponent;

        if (publicInstance && publicInstance.componentWillUnmount)
            publicInstance.componentWillUnmount();

        renderedComponent.unmount();

    }

    receive(nextElement) {
        const prevProps = this.currentElement.props;
        const publicInstance = this.publicInstance;
        const prevRenderedComponent = this.renderedComponent;
        const prevRenderedElement = prevRenderedComponent.currentElement;
        const prevRenderedNode = null;

        this.currentElement = nextElement;
        const nextType = nextElement.type;
        const nextProps = nextElement.props;

        let nextRenderedElement = null;
        let nextRenderedComponent = null;
        let nextRenderedNode = null;

        if (isClass(nextType)) {
            if (publicInstance.componnetWillUpdate)
                publicInstance.componentWillUpdate(nextProps);
            publicInstance.props = nextProps;
            nextRenderedElement = publicInstance.render();
        } else if (typeof nextType === 'function')
            nextRenderedElement = nextType(props);

        if (nextRenderedElement.type === prevRenderedElement.type) {
            prevRenderedComponent.receive(nextRenderedElement);
            return;
        }

        prevRenderedNode = prevRenderedComponent.getHostNode();
        prevRenderedComponent.unmount();

        nextRenderedComponent = instantiateComponent(nextRenderedElement);
        nextRenderedNode = nextRenderedComponent.mount();

        prevRenderedNode.parentNode.replaceChild(nextRenderedNode, prevRenderedNode);
    }

}

class DOMComponent {
    constructor(element) {
        this.currentElement = element;
        this.childComponents = null;
        this.node = null;
    }

    getHostNode() {
        return this.node;
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

        childNodes = childComponents.map(childComponent => {
            const mountNode = childComponent.mount();
            childComponent.mountNode = mountNode;
            return mountNode; 
        });
        childNodes.map(childNode => {
            node.appendChild(childNode);
        });

        return node;
    }

    unmount() {
        const childComponents = this.childComponents;
        childComponents.forEach(childComponent => {
            childComponent.unmount();
        });
    }

    receive(nextElement) {
        const node = this.node;
        const prevProps = this.currentElement.props;
        const nextProps = nextElement.props;

        this.currentElement = nextElement;

        Object.keys(prevProps).forEach(propName => {
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

        const prevChildComponents = this.childComponents;
        const nextChildComponents = [];

        const operationQueue = [];

        for(let i = 0; i < nextChildren.length; i++) {
            const prevChildElement = prevChildren[i];
            const prevChildComponent = prevChildComponents[i];
            let prevNode = null;

            const nextChildElement = nextChildren[i];
            let nextChildComponent = null;
            let nextNode = null;

            nextChildComponents.push(nextChildComponent);

            if (!prevChildComponent) {
                nextChildComponent = instantiateComponent(nextChildElement);
                nextNode = nextChildComponent.mount();

                nextChildComponents.push(nextChildComponent);

                operationQueue.push({ type: 'ADD', node: nextNode });
                continue;
            }

            const canUpdate = prevChildElement.type === nextChildElement.type;

            if (!canUpdate) {
                prevNode = prevChildComponent.getHostNode();
                prevChildComponent.unmount();

                nextChildComponent = instantiateComponent(nextChildElement);
                nextNode = nextChildComponent.mount();

                nextChildComponents.push(nextChildComponent);

                operationQueue.push({ type: 'REPALCE', prevNode, nextNode });  
                continue;
            }

            prevChildComponent.receive(nextChildElement);
            nextChildComponents.push(prevChildComponent);
        }

        for (let i = nextChildren.length; i < prevChildren.length; i++) {
            const prevChildComponent = prevChildComponents[i];
            const prevNode = prevChildComponent.getHostNode();

            prevChildComponent.unmount();

            operationQueue.push({ type: 'REMOVE', node: prevNode });
        }

        this.childComponents = nextChildComponents;

        while (operationQueue.length > 0) {
            const operation = operationQueue.shift();

            switch (operation.type) {
                case 'ADD':
                    node.appendChild(operation.node);
                    break;
                case 'REPLACE':
                    node.replaceChild(operation.nextNode, operation.prevNode);
                    break;
                case 'REMOVE':
                    node.removeChild(operation.node);
                    break;
                default:
                    console.log(`Not find operation.type[${operation.type}]`);
            }
        }
    }
}

function mountTree(element, containerNode) {
    const nextRootElement = element;

    if (containerNode.firstChild) {
        const prevRootNode = containerNode.firstChild;
        const prevRootComponent = prevRootNode._internalInstance;
        const prevRootElement = prevRootComponent.currentElement;

        if (prevRootElement.type === nextRootElement.type) {
            prevRootComponent.receive(nextRootElement);
            return;
        }

        unmountTree(containerNode);
    }

    const rootComponent = instantiateComponent(element);
    const rootNode = rootComponent.mount();
    rootNode._internalInstance = rootComponent;

    containerNode.appendChild(rootNode);

    const publicInstance = rootComponent.getPublicInstance();
    return publicInstance;
}

function unmountTree(containerNode) {
    const rootNode = containerNode.firstChild;
    const rootComponent = rootNode._internalInstance;

    rootComponent.unmount();
    containerNode.innerHTML = '';
}