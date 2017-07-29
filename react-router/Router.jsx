import React from 'react';
import PropTypes from 'prop-types';

class Router extends React.Component {
  static propTypes = { history: PropTypes.object.isRequired, children: PropTypes.node };

  /* 这里同时定义了contextTypes和childContextTypes，表示即获取上层组件的context，又向下层组件传递自己的context
   * 当下层组件接收时，两个context中属性都能获取，但属性被合并到一个context中，不同名属性不影响，同名属性后面的覆盖前面的
   */
  static contextTypes = { router: PropTypes.object };   // 定义contextTypes，以此来访问this.context

  /* 定义 childContextTypes，以此来向子组件传递context，由于对象属性相同，都为router，子组件使用context时，这个Router的context
   * 会覆盖之前的context.router，下面定义的getChildContext可看出，这里是用history及route覆盖了原来router中的同名属性，然后往下传递
   */
  static childContextTypes = { router: PropTypes.object.isRequired };

  getChildContext() {
    return {
      router: {
        ...this.context.router,
        history: this.props.history,
        route: { location: this.props.history.location, match: this.state.match }
      }
    };
  }

  state = { match: this.computeMatch(this.props.history.location.pathname) };   // 定义了初始state

  computeMatch(pathname) {
    return { path: '/', url: '/', params: {}, isExact: pathname === '/' };
  }

  componentWillMount() {
    const { children, history } = this.props;

    /* 此处是核心代码，对history进行了监听，若history发生变化，则会改变match并重新渲染整个路由组件
     * Link组件最后返回的是a标签，当点击a时，会调用history.push(to)来改变history，从而在这里触发监听函数，
     * 通过setState({ match })来重新渲染整个路由，此时，由于路径的变化，会引起Route组件渲染的子组件的变化
     * 从而来达到单页面应用不同路径对应不同组件的效果
     */
    this.unlisten = history.listen(() => {
      this.setState({ match: this.computeMatch(history.location.pathname) });
    });
  }

  componentWillUnmount() {
    this.unlisten();  // unmount时，移除监听
  }

  render() {
    const { children } = this.props;
    return children ? React.Children.only(children) : null;  // Router组件的子元素只能唯一
  }
}

export default Router;
