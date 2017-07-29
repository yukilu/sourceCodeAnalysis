// 假设有如下路由
<BrowserRouter>
    <div>
        <ul>
            <li><Link to='/'>Home</Link></li>
            <li><Link to='/a'>A</Link></li>
            <li><Link to='/b'>B</Link></li>
        </ul>
        <hr/>

        <Route exact path='/' render={() => <h2>Home</h2>} />
        <Route path='/a' component={A} />
        <Route path='/b' component={B} />
    </div>
</BrowserRouter>

//来看BrowserRouter, Link, Route简化代码

// BrowserRouter自己创建了一个history并传入Router中
class BrowserRouter extends React.Component {
  history = createHistory(this.props);

  render() {
    return <Router history={this.history} children={this.props.children} />;
  }
}

class Router extends React.Component {
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

    /* 此处是关键的一环，对history进行了监听，若history发生变化，则会改变match并重新渲染整个路由组件
     * Link组件最后返回的是a标签，当点击a时，会调用history.push(to)来改变history，从而在这里触发监听函数，
     * 通过setState({ match })来重新渲染整个路由
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

class Link extends React.Component {
  // 获取 this.context，这里省略了具体的值，主要是指router中有history，history中的要有push,replace,createHref函数
  static contextTypes = { /*...*/ };

  // 处理点击事件
  handleClick = (event) => {
    // Link中若传入了onClick函数，则先调用
    if (this.props.onClick)
      this.props.onClick(event);

      // 此处原有一些条件才会执行下面代码，这里省略了条件
      event.preventDefault();  // 阻止默认的跳转动作

      const { history } = this.context.router;
      const { replace, to } = this.props;

      if (replace)  // repalce 默认是 false，上面省略了默认设置的代码
        history.replace(to);
      else
        history.push(to);
    }
  }

  render() {
    const { replace, to, innerRef, ...props } = this.props;

    const href = this.context.router.history.createHref( typeof to === 'string' ? { pathname: to } : to);

    // 最后返回的是个a链接
    return <a {...props} onClick={this.handleClick} href={href} ref={innerRef}/>;
  }
}

class Route extends React.Component {

  // 此处contextTypes和childContextTypes和Router中情况一下
  static contextTypes = { router: ... };

  static childContextTypes = { router: PropTypes.object.isRequired };

  getChildContext() {
    return {
      router: {
        ...this.context.router,
        route: {
          location: this.props.location || this.context.router.route.location,
          match: this.state.match
        }
      }
    };
  }

  state = { match: this.computeMatch(this.props, this.context.router) };

  computeMatch({ computedMatch, location, path, strict, exact }, router) { /* ... */ }

  componentWillReceiveProps(nextProps, nextContext) {
    this.setState({ match: this.computeMatch(nextProps, nextContext.router) });
  }

  render() {
    const { match } = this.state;
    const { children, component, render } = this.props;
    const { history, route, staticContext } = this.context.router;
    const location = this.props.location || route.location;
    const props = { match, location, history, staticContext };

    /* 这里是核心代码，当路径不同时，match的值也不同，重新渲染Route时得到的组件就不同
     * 可以看到渲染优先级 component > render > children
     */
    return (
      component ? (
        match ? React.createElement(component, props) : null
      ) : render ? (
        match ? render(props) : null
      ) : children ? (
        typeof children === 'function' ? (
          children(props)
        ) : !isEmptyChildren(children) ? (
          React.Children.only(children)
        ) : (
          null
        )
      ) : (
        null
      )
    );
  }
}