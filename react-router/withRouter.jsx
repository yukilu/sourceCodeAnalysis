import React from 'react';
import PropTypes from 'prop-types';
import hoistStatics from 'hoist-non-react-statics';
import Route from './Route';

/* withRouter适用场景，在react-redux中的connect连接后的组件(包含Route)，有些情况下(参见demo的withRouterConnected.jsx)
 * 切换路由时，在Router下不能正常重新渲染，此时就要通过withRouter(connected)后返回的组件进行强制渲染，就可以正常使用了
 *
 * 无法重新渲染的理由如下:
 * 链接: https://reacttraining.com/react-router/web/guides/redux-integration
 * redux自己实现了shouldComponentUpdate，如果该connect后的组件没有从Router获取任何属性，那connect后的组件就认为没变化，
 * 就不会重新渲染，从而造成其中的Route组件也无法重新渲染
 *
 * 从以上理由可知，只有当connect包裹的组件位于Router和Route中间时，才会阻断Router的渲染无法传递到Route，从而发生上述问题
 * 共有三种情况:
 * 1. connect包裹的组件在Router上层，没影响，如
 *    function Wrap(props) {
 *      const { count, increase, decrease } = props;
 *      return (
 *        <Router>
 *          <div>
 *            <ul>
 *              <li><Link to='/'>Home</Link></li>
 *              <li><Link to='/c'>Counter</Link></li>
 *            </ul>
 *            <hr/>
 *
 *            <Route exact path='/' render={() => <h2>Home</h2>} />
 *            <Route path='/c' render={() => <Counter count={count} increase={increase} decrease={decrease} />} />
 *          </div>
 *        </Router>
 *      );
 *    }
 *
 *   const ConnectedWrap = connect(mapStateToProps, mapDispatchToProps)(Wrap);
 *   render(
 *     <Provider store={store}>
 *       <ConnectedWrap />
 *     </Provider>,
 *     containerNode
 *   );
 *
 * 2.connect包裹的组件位于Router和Route中间，有影响，如
 *   function Wrap(props) {
 *     const { count, increase, decrease } = props;
 *     return (
 *       <div>
 *         <ul>
 *           <li><Link to='/'>Home</Link></li>
 *           <li><Link to='/c'>Counter</Link></li>
 *         </ul>
 *         <hr/>
 *
 *         <Route exact path='/' render={() => <h2>Home</h2>} />
 *         <Route path='/c' render={() => <Counter count={count} increase={increase} decrease={decrease} />} />
 *       </div>
 *     );
 *   }
 *
 *   const ConnectedWrap = connect(mapStateToProps, mapDispatchToProps)(Wrap);
 *   此处要修正为 ConnectedWrap = withRouter(connect(mapStateToProps, mapDispatchToProps)(Wrap))
 *   render(
 *     <Provider store={store}>
 *       <Router>
 *         <ConnectedWrap />
 *       </Router>
 *     </Provider>,
 *     containerNode
 *   );
 *
 * 3.connect包裹的组件位于Route之后，没影响，如
 *   const ConnectedCounter = connect(mapStateToProps, mapDispatchToProps)(Counter);
 *   
 *   function Wrap(props) {
 *      return (
 *        <Router>
 *          <div>
 *            <ul>
 *              <li><Link to='/'>Home</Link></li>
 *              <li><Link to='/c'>Counter</Link></li>
 *            </ul>
 *            <hr/>
 *
 *            <Route exact path='/' render={() => <h2>Home</h2>} />
 *            <Route path='/c' component={ConnectedCounter} />
 *          </div>
 *        </Router>
 *      );
 *   }
 *
 *   render(
 *     <Provider store={store}>
 *       <Wrap />
 *     </Provider>,
 *     containerNode
 *   );
 *
 * 原理参见如下代码，通过C函数，将原组件通过<Route />包裹起来，并将其放入Route的render属性中，因为没定义path，当路由切换时，
 * 就会渲染该Route，从而引起其中包裹的原组件(即connect后的组件)的重新渲染并将Router中的一些属性传入connect后的组件中，这样
 * 会引起connect后的组件的props发生变化，从而重新渲染，引起子组件中Route的重新渲染(?)
 */
function withRouter(Component) {
  function C(props) {
    const { wrappedComponentRef, ...remainingProps } = props;
    return (
      <Route render={routeComponentProps => (
        <Component {...remainingProps} {...routeComponentProps} ref={wrappedComponentRef}/>
      )}/>
    );
  }

  C.displayName = `withRouter(${Component.displayName || Component.name})`;
  C.WrappedComponent = Component;
  C.propTypes = { wrappedComponentRef: PropTypes.func };

  return hoistStatics(C, Component);  // Component上的静态变量拷贝到C上，并返回C
}

export default withRouter;
