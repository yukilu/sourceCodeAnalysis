import React from 'react';
import PropTypes from 'prop-types';
import hoistStatics from 'hoist-non-react-statics';
import Route from './Route';

/* withRouter适用场景，在react-redux中的connect连接后的组件(包含Route)，有些情况下(connect位于Router和Route中间)切换
 * 路由时，在Router下不能正常重新渲染，此时就要通过withRouter(connected)后返回的组件进行强制渲染，就可以正常使用了，
 * 而且withRouter的参数必须为connected的组件，若中间隔了其他组件，则无效
 *
 * 无法重新渲染的理由如下:
 * 链接: https://reacttraining.com/react-router/web/guides/redux-integration
 * redux自己实现了shouldComponentUpdate，如果该connect后的组件没有从Router获取任何属性，那connect后的组件就认为没变化，
 * 就不会重新渲染，从而造成其中的Route组件也无法重新渲染
 *
 * 从以上理由可知，只有当connect包裹的组件位于Router和Route中间时，才会阻断Router的渲染无法传递到Route，从而发生上述问题
 * 不考虑Provider位置共有3种情况(考虑共有6种，详细代码参见demo文件夹下withRouter对应文件):
 * 1.connect -> Router -> Route，connect包裹的组件在Router上层，没影响，参见withRouterHead.jsx
 * 2.Router -> connect -> Route，connect包裹的组件位于Router和Route中间，有影响，参见withRouterMiddle.jsx
 *   withRouterMiddle_wrapAgain.jsx演示了一个错误例子，说明withRouter传入的参数必须为connected组件，中间不能有间隔组件，不然会失效
 * 3.Router -> Route -> connect，connect包裹的组件位于Route之后，没影响，参见withRouterEnd.jsx
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
