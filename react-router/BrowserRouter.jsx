import React from 'react';
import createHistory from 'history/createBrowserHistory';
import { Router } from 'react-router';

// BrowserRouter自己创建了一个history并传入Router中
class BrowserRouter extends React.Component {
  history = createHistory(this.props);

  render() {
    return <Router history={this.history} children={this.props.children} />;
  }
}

export default BrowserRouter;
