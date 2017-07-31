import { render } from 'react-dom';
import { Provider } from 'react-redux';

import ConnectedCounter from './components/Counter';
import { store } from './store/counterStore';

//将Provider包裹了一层，Provider不需要在最外层，只需要在Connected组件外层就可以，也不用紧密连接，结构如下
// ... -> Provider -> ... -> Connected -> ...
function ProviderWrap(props) {
    return (
        <Provider store={store} >
            <ConnectedCounter />
        </Provider>
    );
}

render(
    <ProviderWrap />,
    document.getElementById('root')
);