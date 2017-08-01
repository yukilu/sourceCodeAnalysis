import { render } from 'react-dom';
import { Provider } from 'react-redux';

import ConnectedCounter from './components/Counter';
import { store } from './store/counterStore';

//两个Provider，传入了同一个store，则其子组件使用的state都是同一个，值会同时改变
function ProviderWrap(props) {
    return (
        <div>
            <Provider store={store} >
                <ConnectedCounter />
            </Provider>
            <Provider store={store} >
                <ConnectedCounter />
            </Provider>
        </div>
    );
}

render(
    <ProviderWrap />,
    document.getElementById('root')
);