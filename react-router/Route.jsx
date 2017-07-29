import React from 'react';
import PropTypes from 'prop-types';
import matchPath from './matchPath';

const isEmptyChildren = children => React.Children.count(children) === 0;

class Route extends React.Component {
  static propTypes = {
    computedMatch: PropTypes.object, // private, from <Switch>
    path: PropTypes.string,
    exact: PropTypes.bool,
    strict: PropTypes.bool,
    component: PropTypes.func,
    render: PropTypes.func,
    children: PropTypes.oneOfType([
      PropTypes.func,
      PropTypes.node
    ]),
    location: PropTypes.object
  };

  // 此处contextTypes和childContextTypes和Router中情况一下
  static contextTypes = {
    router: PropTypes.shape({
      history: PropTypes.object.isRequired,
      route: PropTypes.object.isRequired,
      staticContext: PropTypes.object
    })
  };

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

  computeMatch({ computedMatch, location, path, strict, exact }, router) {
    if (computedMatch)
      return computedMatch; // <Switch> already computed the match for us

    invariant(router, 'You should not use <Route> or withRouter() outside a <Router>');

    const { route } = router;
    const pathname = (location || route.location).pathname;

    return path ? matchPath(pathname, { path, strict, exact }) : route.match;
  }

  // 重新渲染时，将match重新计算，并通过setState设置
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
      component ? ( // component prop gets first priority, only called if there's a match
        match ? React.createElement(component, props) : null
      ) : render ? ( // render prop is next, only called if there's a match
        match ? render(props) : null
      ) : children ? ( // children come last, always called
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

export default Route;
