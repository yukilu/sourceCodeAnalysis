// 实现react主要功能的简易代码，并能追溯各Component的子组件

// 创建element的代码，形如 { type: A, props: { propName: propKey } }，{ type: 'div', props: { propName: propKey } }
function createElement(type, props) {
    if (!props)
        props = {};

    return { type, props };
}

/* 实例化Component函数，element可分为两类
 * 1. type为function(es6的class只是语法糖，本质也是function)，即为react组件
 * 2. type为string，即为DOM组件
 */
function instantiateComponent(element) {
    const type = element.type;
    if (typeof type === 'function')
        return new CompositeComponent(element);
    else if (typeof type === 'string')
        return new DOMComponent(element);
}

// react组件为class时，自定义一个静态变量isClass，值设为true
function isClass(type) {
    if (typeof type === 'function' && type.isClass)
        return true;
    return false;
}

/* 以下定义了CompositeComponent及DOMComponent
 * 在CompositeComponent中，实例化的Component挂载element,publicInstance,renderedComponent，针对React组件
 * 在DOMComponent中，实例化的Component挂载element,node,childComponents，针对DOM组件
 *
 * 渲染过程大概为:
 * 考虑根节点
 * 1. 当为react组件时，由于react组件总会render另一个组件，可能为react组件或DOM组件，若还为react组件时，
 *    则继续render...直到为DOM组件为止，创建该DOM元素，步骤同2
 * 2. 当为DOM组件时，则创建该DOM元素，并将其包含的子组件全部渲染，子组件若为react组件，步骤同1，若为DOM组件，步骤同2，
 *    然后将渲染得到的子节点加入当前节点中
 *    
 * 通过CompositeComponent及DOMComponent函数创建对象，并将上述的element和react组件实例或DOM组件node挂载到自己对应的对象上
 * 这样通过上述渲染过程，就可以形成一个层级结构，在根组件重新渲染时，可以追溯之前的子组件，并比较新的子组件，若相同，则不
 * 需要重新渲染，直接使用原组件即可，如此可以提高性能。
 * 
 * 当然其实不通过这两个函数建立新对象，直接使用element或者element.type实例化的对象也是可以的，只需要将需要的属性直接挂载上去即可
 * 但是这样就会污染原来的对象，这种做法并不好，不如直接自己建立一个新对象，然后将需要的属性挂载上去好些
 *
 * 上述过程，类似于递归，当render的结果为react组件时，则不断递归，结束条件为当render的结果为DOM组件。
 * 例子如下，渲染过程如箭头所示
 * const A = props => <B />;
 * const B = props => <C />;
 * const C = props => <div></div>;
 * A -> B -> C -> div     <div></div>
 *
 * A,B同上
 * const C = props => <div><D /><p></p><div>;
 * const D = props => <E />
 * const E = props => <h2></h2>
 * A -> B -> C -> div               <div>
 *                    D -> E -> h2    <h2></h2>
 *                    p               <p></p>
 *                                  </div>
 */

/* CompositeComponent，复合组件，constructor函数可以看出，在其实例下挂载了以下属性
 * 1. currentElement，即传入的element    { type: A, props: { a: 0 } }
 * 2. publicInstance，实例化element.type指向的react组件    publicInstance = new A(props); publicInstance.props = props;
 * 3. renderedComponent，通过publicInstance.render后的element再实例化的组件
 *    renderedElement = publicInstance.render();  renderedComponent = instantiateComponent(renderedElement);
 */
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
            // type为class时实例化element.type指向的react组件
            publicInstance = new type(props);
            // 将props挂载到实例上，就可以在实例中使用this.props访问props
            publicInstance.props = props;
            // 调用react组件的实例上的render函数，返回render后的element
            renderedElement = publicInstance.render();
        } else if (typeof type === 'function')
            // 当type为普通函数时，直接调用type(props)，得到render的element，因是普通函数，非类，publicInstance不存在，不用设置，前面默认为null
            renderedElement = type(props);

        // 将上述render得到的element，通过instantiateComponent实例化，因为element.type不定，可能继续是react组件，也可能为DOM组件
        renderedComponent = instantiateComponent(renderedElement);
        // 挂载publicInstance到该CompositeComponent上，就可以通过该实例访问到对应的react组件的实例
        this.pulicInstance = publicInstance;
        // 挂载renderedComponent，这样就可以知道当前Component的下一个Component是谁，就可以将结构串起来
        this.renderedComponent = renderedComponent;

        /* 此处类似于递归，并且是个尾递归
         * 若假设当前组件为rootComponent,则在mountTree中渲染时，rootComponent.mount()启动，执行rootComponent.renderedComponent.mount()
         * 继续执行rootComponent.renderedComponent.renderedComponent.mount()... 层层mount下去，直到到达DOMComponent时返回node
         * unmount, receive及getHostNode函数原理同上
         *
         * 渲染示意图
         * rtC = rootComponent, rC = renderedComponent, m = mount
         * CC = CompositeComponent, DOMC = DOMComponent
         * rtC.m() -> rtC.rC.m() -> rtC.rC.rC.m() -> rtC.rC.rC.rC.m() -> ... -> rtC.rc...rc.m() => node
         * CC             CC               CC                  CC        CC              DOMC   =  node
         */
        return renderedComponent.mount();
    }

}

/* DOMComponent DOM组件，实例挂载了以下属性
 * 1. currentElement，即传入的element
 * 2. childComponents，即根据props.children.map(instantiateComponent)得到的，以用来追溯props.children对应的子组件
 * 3. node，根据element.type生成的原生DOM节点，并了加入各childNodes子节点
 */
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
        // DOMComponent中，要对children进行渲染，所以单独列出，而CompositeComponent中则不会对其children进行渲染
        let children = props.children;

        let childComponents = null;
        let childNodes = null;

        // 创建当前根节点并将node属性挂载上去
        const node = document.createElement(type);
        this.node = node;

        // 在node节点上设置props中的属性
        Object.keys(props).forEach(propName => {
            if (propName !== 'children')
                node.setAttribute(propName, props[propName]);
        });

        // children不存在时为空数组，不然下面children.map要报错
        if (!children)
            children = [];

        // 当children为一个元素时，children并不是数组，多个元素才会形成数组，所以此处对一个元素进行处理
        if (!Array.isArray(children))
            children = [children];

        // 调用instantiateComponent对children中每个组件进行处理，并挂载上去，这样重新渲染时好追溯上次的子元素是哪些
        childComponents = children.map(instantiateComponent);
        this.childComponents = childComponents;

        // 调用每个Component的mount函数，返回对应各自对应的DOM节点
        childNodes = childComponents.map(childComponent => childComponent.mount());
        // 将DOM子节点逐个加入当前node父节点中
        childNodes.map(childNode => {
            node.appendChild(childNode);
        });

        // 将当前node节点返回，子节点已渲染完成并都加入了node父节点中
        return node;
    }
}

function mountTree(element, containerNode) {
    const rootComponent = instantiateComponent(element);
    // 根组件的mount函数，触发了其下各层子组件的mount()，形成了层级，并处理了各react组件或DOM组件，最终返回了DOM根节点
    const rootNode = rootComponent.mount();

    // 将上述mount()得到的DOM根节点加入指定的containerNode中
    containerNode.appendChild(rootNode);
}