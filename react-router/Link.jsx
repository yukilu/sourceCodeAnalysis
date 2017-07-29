import React from 'react';
import PropTypes from 'prop-types';

class Link extends React.Component {
  static propTypes = { onClick: PropTypes.func, target: PropTypes.string, replace: PropTypes.bool, to: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.object
    ]).isRequired
  };

  // 获取 this.context，主要是指router中有history，history中的要有push,replace,createHref函数
  static contextTypes = {
    router: PropTypes.shape({
      history: PropTypes.shape({
        push: PropTypes.func.isRequired,
        replace: PropTypes.func.isRequired,
        createHref: PropTypes.func.isRequired
      }).isRequired
    }).isRequired
  };

  static defaultProps = { replace: false };

  // 点击Link(实际上位a标签)时触发当前handleClick函数
  handleClick = event => {
    // Link中若传入了onClick函数，则先调用
    if (this.props.onClick)
      this.props.onClick(event);

      // 此处原有一些条件才会执行下面代码，这里省略了条件
      event.preventDefault();  // 阻止默认的跳转动作

      const { history } = this.context.router;
      const { replace, to } = this.props;

      // 这里调用history的replace或push，然后触发Router中的监听函数，造成整个Router重新渲染
      if (replace)  // repalce 默认是 false
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

export default Link;