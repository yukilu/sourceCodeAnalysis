// Provider和connect所有关系

/* 规律总结
 * 1. Connected组件间可以相互嵌套，Connected组件与Provider也可以相互嵌套，不会有什么问题
 * 2. Connected组件连接的store总是上层组件中最近的那个Provider传入的store
 * 3. Connected组件连接的store相同时，若监听的是同一个属性，会互相影响，其他情况(监听不同属性，连接不同store)不会影响
 */

/* Provider的定义中，渲染的为props.children，所以渲染<Provider><Connected/></Provider>时，会继续渲染Connected组件
 * Provider -> Connected
 * 所以在下面的示例中，为了更清晰的显示结构，connect嵌套时，外层connect的原组件定义与Provider相似，也渲染props.children
 * class A extends React.Component {
 *     render() {
 *         return React.Children.only(this.props.children);
 *     }
 * }
 * 这样的话connect组件嵌套时，<ConnectedA><ConnectedB/></ConnectedA> 就是 ConnectedA -> ConnectedB 结构
 * 实际上是ConnectedA -> A -> ConnectedB -> B，是ConnectedA渲染A时，将其children属性传入了A中
 * 这样才能在A中渲染ConnectedA的children属性，详情参见connect_childen.jsx
 * 当然这不是必须的，因为只需要在A中返回的值中包含B组件可以，这样就能形成嵌套关系，最简单示例如下
 * class A extends React.Component {
 *     render() {
 *         return <B/>;
 *     }
 * }
 * 这里是为了更清楚的展现结构才采取了上面的方法
 * 当connect组件为平行关系时，就不需要这么定义，普通的定义就可以了
 */

/* Provider与connect的相对关系，不必紧密相连，只要Provider在connect外层即可，且Provider不必为root组件
 * 1. Provider为root组件，紧连着connect
 *    Provider -> connect
 * 2. Provider为root组件，不紧连着connect
 *    Provider -> ... -> connect
 * 3. Provider不是root组件，紧连着connect
 *    ... -> Provider -> connect
 * 4. Provider不是root组件，不紧连着connect
 *    ... -> Provider -> ... -> connect
 */

// Provider和connect，平行及嵌套关系

// 1***  1 Provider + 1 connect
<Provider store={store}>
    <Connected />
</Provider>

// 2***  1 Provider + 2 connect (结构有connect平行还是嵌套2种情况, 只有一个Provider，不用考虑store异同)
// Provider -> Provider -> ConnectedA + ConnectedB || Provider -> ConnectedA -> ConnectedB

// 2.1** connect平行
// Provider -> ConnectedA + ConnectedB
<Provider store={store}>
    <div>
        <ConnectedA />
        <ConnectedB />
    </div>
</Provider>
// 若监听同名属性，组件会互相影响，这种情况其实与4.1.1是相同的

// 2.2** connect嵌套
// Provider -> ConnectedA -> ConnectedB
<Provider store={store}>
    <ConnectedA>
        <ConnectedB />
    </ConnectedA>
</Provider>
// ConnectedA为ConnectedB父组件，当然原组件A的写法，render中得渲染this.children才行
// function A(props) { return React.Children.only(this.children); }

// 3***  2 Provider + 1 connect (结构只有1种情况， 再分store异同，共2类)
// Provider -> Provider -> connect
// 就一个connect，没法平行，因为Provider不搭配connect是没意义的，但是传入的store可以不同，所以Provider只能嵌套

// 3.1** store不同
// Proivder(store) -> Provider(anotherStore) -> Connected
<Provider store={store}>
    <Provider store={anotherStore}>
        <Connected />
    </Provider>
</Provider>
// 由contex机制知，若子组件向context挂载的属性与父组件同名时，子组件会覆盖父组件上的context同名属性
// 由于Provider到context上的都为store，所以anoterStore会覆盖store，Connected组件中关联的是内层的anotherStore

// 3.2** store相同(与1效果同)
// Provider(store) -> Provider(store) -> Connected
<Provider store={store}>
    <Provider store={store}>
        <Connected />
    </Provider>
</Provider>
// 这个不用想，无论如何，连接的必然为store，这种做法也是不必要的，只需要一层Provider就够了，就如最简单的1中那样

// 4***  2 Provider + 2 connect
// 这种情况比较复杂，要考虑平行，嵌套，store是否相同，但是connect外层必有Provider是确定的

// 4.1** Provider平行 (结构只有1种情况，再分store异同，共2类)
// Provider(ConnectedA) + Provider(ConnectedB)
//一个Provider搭配一个connect，Provider平行只能如上结构

// 4.1.1* store相同
// Provider(store) + Provider(store)
<div>
    <Provider store={store}>
        <ConnectedA />
    </Provider>
    <Provider store={store}>
        <ConnectedB />
    </Provider>
</div>
// 由于传的是相同的store，A,B组件关联到同一个store上，所以被连接组件A,B，改变state中的值的时候，A，B所获取的state都会改变
// 当ConnectedA，ConnectedB监听的属性相同时，会互相影响，A的改变会引发B的重新渲染，B同理，改变值会引发另一个组件的重新渲染

// 4.1.2* store不同
// Provider(store) + Provider(anotherStore)
<div>
    <Provider store={store}>
        <ConnectedA />
    </Provider>
    <Provider store={anotherStore}>
        <ConnectedB />
    </Provider>
</div>
// 传入的store不同，A,B组件关联到不同store上，这样会造成ConnectedA和ConnectedB是独立的，互不影响

// 4.2** Provider嵌套(按Provider中间是否有connect分为两大类)

// 4.2.1* 两个Provider中间没有connect时(与2效果同，按照connect结构，不考虑store异同，共分为2大类)
// Provider -> Provider -> ConnectedA + ConnectedB || Provider -> Provider -> ConnectedA -> ConnectedB

// 4.2.1.1 connect平行 (store异同，共分为2类)
// Provider -> Provider -> ConnectedA + ConnectedB

// 4.2.1.1.1 store相同
// Provider(store) -> Provider(store) -> ConnectedA + ConnectedB
<Provider store={store}>
    <Provider store={store}>
        <div>
            <ConnectedA />
            <ConnectedB />
        </div>
    </Provider>
</Provider>
//Provider相同时搞两层是多余的，一层就够

// 4.2.1.1.2 store不同
// Provider(store) -> Provider(anotherStore) -> ConnectedA + ConnectedB
<Provider store={store}>
    <Provider store={anotherStore}>
        <div>
            <ConnectedA />
            <ConnectedB />
        </div>
    </Provider>
</Provider>
// 内层store会覆盖外层，连接的store为内层的anotherStore

// 4.2.1.2 connect嵌套 (store异同，共分为2类)
// Provider -> Provider -> ConnectedA -> ConnectedB

// 4.2.1.2.1 store相同
// // Provider(store) -> Provider(store) -> ConnectedA -> ConnectedB
<Provider store={store}>
    <Provider store={store}>
        <ConnectedA >
            <ConnectedB />
        </ConnectedA>
    </Provider>
</Provider>
// 两层Proivder多余，一层就够



// 4.2.1.2.2 store不同
// Provider(store) -> Provider(anotherStore) -> ConnectedA -> ConnectedB
<Provider store={store}>
    <Provider store={anotherStore}>
        <ConnectedA >
            <ConnectedB />
        </ConnectedA>
    </Provider>
</Provider>
// 内层store会覆盖外层，连接的store为内层的anotherStore

// 4.2.2* Povider之间有connect (结构有2种，再分store异同)
// 因为Provider之间有connect，而另一个connect必然在里层Provider之后，但是外层connect和内层Provider可能平行或嵌套
// 所以不考虑store异同，排列顺序有两种情况
// Provider -> connect -> Provider -> connect || Proivder -> connect + Proivder(connect)

// 4.2.2.1 外层connect与内层Provider平行
// Provider -> connect + Provider(connect)

// 4.2.2.1.1 store相同
// Provider(store) -> connect + Proivder(store)
<Provider store={store}>
    <ConnectedA/>
    <Provider store={store}>
        <ConnectedB/>
    </Provider>
</Provider>
// 因为连接了同一个store，会互相影响

// 4.2.2.1.2 store不同
// Provider(store) -> connect + Proivder(anotherStore)
<Provider store={store}>
    <ConnectedA/>
    <Provider store={anotherStore}>
        <ConnectedB/>
    </Provider>
</Provider>
// A连接了store，而对于B来说有两个Provier，内层的屏蔽了外层的，所以连接的是内层Provider的anotherStore
// 由于连接的store不同，互不影响

// 4.2.2.2 外层connect嵌套内层Provider
// Provider -> connect -> Provider -> connect

// 4.2.2.2.1 store相同
// Provider(store) -> connect -> Provider(store) -> connect
<Provider store={store}>
    <ConnectedA>
        <Provider store={store}>
            <ConnectedB/>
        </Provider>
    </ConnectedA>
</Provider>
// A,B连接相同的store，互相影响

//4.2.2.2.2 store不同
// Provider(store) -> connect -> Provider(anotherStore) -> connect
<Provider store={store}>
    <ConnectedA>
        <Provider store={anotherStore}>
            <ConnectedB/>
        </Provider>
    </ConnectedA>
</Provider>
// A,B连接不同的store，互相独立