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

    // 返回挂载的react组件的实例
    getPublicInstance() {
        return this.publicInstance;
    }

    // renderedComponent为CompositeComponent时，递归调用getHostNode，直到遇到DOM组件，返回node
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
            if (publicInstance.componentWillMount)  // 组件生命周期componentWillMount在此处调用，然后再调用render
                publicInstance.componentWillMount();
            renderedElement = publicInstance.render();
        } else if (typeof type === 'function') {
            publicInstance = null;
            renderedElement = type(props);
        }

        renderedComponent = instantiateComponent(renderedElement);
        this.publicInstance = publicInstance;
        this.renderedComponent = renderedComponent;

        return renderedComponent.mount();
    }

    /* 组件生命周期componentWillUnmount在此处调用，并通过renderedComponent.unmount，层层递归，层层往下调用unmount
     * rtC = rootComponent, rC = renderedComponent, um = unmount
     * rtC.um() -> rtC.rC.um() -> rtC.rC.rC.um() -> ... -> rtC.rC...rC.um()
     * 遇到DOMComponent时，子组件childComponents中，每个调用unmount()，然后就回到上述过程
     */
    unmount() {
        const publicInstance = this.publicInstance;
        const renderedComponent = this.renderedComponent;

        if (publicInstance && publicInstance.componentWillUnmount)
            publicInstance.componentWillUnmount();

        renderedComponent.unmount();
    }

    /* 合成组件，prevElement.type === nextElement.type时，调用receive函数，该函数有两个作用
     * 1. 由于type相同，所以该Component下挂载的react组件的publicInstance不用更改，只需要更改props，并重新render
     * 2. 比较上述元素的新的renderedElement的type与旧的renderedElement的type是否相同
     *    prevRenderedElement.type === nextRenderedElement.type
     *    1) true，即相同时，调用prevRenderedComponent.receive(nextRenderedElement)，继续调用rendered组件的receive，而不需要新实例化组件
     *    2) false，即不同时，通过instantiateComponent(nextRenderedElement)实例化新组件，将旧组件unmout掉，并用新节点替换旧节点
     */
    receive(nextElement) {
        const publicInstance = this.publicInstance;

        const prevProps = this.currentElement.props;
        const prevRenderedComponent = this.renderedComponent;
        const prevRenderedElement = prevRenderedComponent.currentElement;
        let prevRenderedNode = null;

        // 挂载新的element，其实type相同，只有props不同
        this.currentElement = nextElement;
        const nextType = nextElement.type;
        const nextProps = nextElement.props;

        let nextRenderedElement = null;
        let nextRenderedComponent = null;
        let nextRenderedNode = null;

        // 判断即将更新的元素的type为class或普通函数
        if (isClass(nextType)) {
            if (publicInstance.componentWillUpdate)  // 生命周期的componentWillUpdate
                publicInstance.componentWillUpdate(nextProps);
            // react实例还为原来实例，而实例的props更改为新元素的props，并重新render，返回新的renderedElement
            publicInstance.props = nextProps;
            nextRenderedElement = publicInstance.render();
        } else if (typeof nextType === 'function')
            nextRenderedElement = nextType(nextProps);

        /* 新旧renderedElement的type相同时，继续调用prevRenderedComponent.receive(nextRenderedElement)，以此实现层层往下调用receive
         * 但是注意，千万不要通过判断prevPros === nextProps相同时，就不调用receive函数，这样会造成receive无法层层调用
         * 会使再下层的组件改变时却无法重新渲染
         */
        if (nextRenderedElement.type === prevRenderedElement.type) {
            prevRenderedComponent.receive(nextRenderedElement);
            return;
        }

        // 新旧renderedElement的type不同时
        // 通过prevRenderedComponent.getHostNode()获得旧节点，并通过unmount()来调用react组件生命周期的componentWillUnmount
        prevRenderedNode = prevRenderedComponent.getHostNode();
        prevRenderedComponent.unmount();

        // 通过新的renderedElement获得新的renderedComponent，并通过mount()得到新节点
        nextRenderedComponent = instantiateComponent(nextRenderedElement);
        nextRenderedNode = nextRenderedComponent.mount();

        // 用新节点替换旧节点
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

        childNodes = childComponents.map(childComponent => childComponent.mount());
        childNodes.map(childNode => {
            node.appendChild(childNode);
        });

        return node;
    }

    // DOM组件的子元素组件逐个unmount()
    unmount() {
        const childComponents = this.childComponents;
        childComponents.forEach(childComponent => {
            childComponent.unmount();
        });
    }

    /* DOM组件的receive函数作用有二
     * 1. 对当前DOM组件下挂载的DOM节点，根据新props更新DOM节点上的属性
     * 2. 对DOM组件下的子组件，重新处理，当然实际react处理时会根据key值来处理，此处简化处理，分为以下几种情况
     *    1) 旧的子组件个数大于等于新的子组件
     *    2) 旧的子组件个数少于新的子组件
     */
    receive(nextElement) {
        const node = this.node;
        const prevProps = this.currentElement.props;
        const nextProps = nextElement.props;

        this.currentElement = nextElement;

        // 移除DOM组件中非children及nextProps中不存在的属性
        Object.keys(prevProps).forEach(propName => {
            if (propName !== 'children' && !nextProps.hasOwnProperty(propName))
                node.removeAttribute(propName);
        });

        // 根据nextProps中的属性更新DOM组件中的属性
        Object.keys(nextProps).forEach(propName => {
            if (propName !== 'children')
                node.setAttribute(propName, nextProps[propName]);
        });

        /* 处理单个元素时，children为非数组，prevChildren, nextChildren实际上是元素的数组，prevChildElements, nextChildElements
         * prevChildren, nextChildren 形如 [ { type: A, props }, { type: B, props }, { type: 'p', props } ]
         */
        let prevChildren = prevProps.children || [];
        if (!Array.isArray(prevChildren))
            prevChildren = [prevChildren];
        let nextChildren = nextProps.children || [];
        if (!Array.isArray(nextChildren))
            nextChildren = [nextChildren];

        const prevChildComponents = this.childComponents;
        const nextChildComponents = [];

        // 操作队列，存储操作元素
        const operationQueue = [];

        // 处理DOM组件的新子元素数组，nextChildren
        for(let i = 0; i < nextChildren.length; i++) {
            const prevChildElement = prevChildren[i];   // 旧的子元素数组对应的子元素
            const prevChildComponent = prevChildComponents[i];  // 旧的子组件数组对应的子组件
            let prevNode = null;

            const nextChildElement = nextChildren[i];   // 新的子元素数组对应的子元素
            let nextChildComponent = null;
            let nextNode = null;

            /* prevChild不存在时，即当prevChildren的数组长度小于nextChildren时，处理nextChildren后面多出的部分，添加即可
             * 形如 prevChildren [ { type: A }, { type: 'p' } ]
             *      nextChildren [ { type: A }, { type: B }, { type: C }, { type: 'span' } ]
             * 当 i = 2, 3 时，prevChildComponents[i]为undefined，进入这里
             */
            if (!prevChildComponent) {
                nextChildComponent = instantiateComponent(nextChildElement);  // 根据新子元素实例化
                nextNode = nextChildComponent.mount();    // 通过对上面的实例进行mount得到新节点

                nextChildComponents.push(nextChildComponent);   // 将上面实例化的新实例添加到新的子组件数组中

                operationQueue.push({ type: 'ADD', node: nextNode });   // operation的操作为添加 ADD，对应node.append(node)
                continue;
            }

            // prevChild和nextChild都存在时
            const canUpdate = prevChildElement.type === nextChildElement.type;  // 判断该子元素element的type是否相同

            //element的type不同时
            if (!canUpdate) {
                prevNode = prevChildComponent.getHostNode();  // 获取旧节点
                prevChildComponent.unmount();   // 旧Component的unmount

                nextChildComponent = instantiateComponent(nextChildElement);
                nextNode = nextChildComponent.mount();  // 获取新节点

                nextChildComponents.push(nextChildComponent);   // 添加新增的组件实例

                operationQueue.push({ type: 'REPLACE', prevNode, nextNode });   // 操作队列中添加操作替换 REPLACE，对应node.replace(newNode, oldNode)
                continue;
            }

            //element的type相同时，只需要调用receive，操作队列不需要添加操作
            prevChildComponent.receive(nextChildElement);
            nextChildComponents.push(prevChildComponent);   // nextChildComponents只需要添加原组件即可
        }

        /* 当prevChildren元素多与nextChildren时，处理prevChildren多出来的部分，删除即可
         * 形如 prevChildren [ { type: A }, { type: B }, { type: 'p' }, { type: C } ]
         *      nextChildren [ { type: A }, { type: 'span' } ]
         * for (let i = 2; i < 4; i++) { ... }
         */
        for (let i = nextChildren.length; i < prevChildren.length; i++) {
            const prevChildComponent = prevChildComponents[i];
            const prevNode = prevChildComponent.getHostNode();  // 获取旧节点并在下面unmount

            prevChildComponent.unmount();

            operationQueue.push({ type: 'REMOVE', node: prevNode });    // 删除对应的旧节点
        }

        this.childComponents = nextChildComponents; // 将新组件数组更新到实例上

        // 执行操作队列，通过switch来执行对应的DOM操作
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

// 渲染组件树
function mountTree(element, containerNode) {
    const nextRootElement = element;

    // containerNode中原来已有子节点
    if (containerNode.firstChild) {
        const prevRootNode = containerNode.firstChild;  // 获取唯一子节点，即组件树的根节点
        const prevRootComponent = prevRootNode._internalInstance;  // 通过下面挂载的_internalInstance属性追溯到根组件
        const prevRootElement = prevRootComponent.currentElement;  // 获取当前组件下的对应element

        // 当新旧element.type相同时，直接调用receive更新props，并重新render渲染
        if (prevRootElement.type === nextRootElement.type) {
            prevRootComponent.receive(nextRootElement);
            return;
        }

        // 新旧element.type不同时，清空containerNode，并进入以下代码重新渲染组件树
        unmountTree(containerNode);
    }

    // containerNode为空，没有子节点
    const rootComponent = instantiateComponent(element);
    const rootNode = rootComponent.mount();
    rootNode._internalInstance = rootComponent;  // 在根节点上挂载一个属性指向rootComponent，就可以通过根节点追溯根组件

    containerNode.appendChild(rootNode);  // 将根节点加入containerNode中

    const publicInstance = rootComponent.getPublicInstance();
    return publicInstance;  // 将根组件上的react组件的实例返回
}

function unmountTree(containerNode) {
    const rootNode = containerNode.firstChild;  // 获取根节点
    const rootComponent = rootNode._internalInstance;   // 通过_internalInstance追溯到根组件，并在下面调用unmount

    rootComponent.unmount();
    containerNode.innerHTML = '';   // 清空containerNode
}