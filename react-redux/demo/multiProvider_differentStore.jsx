import { render } from 'react-dom';
import { Provider } from 'react-redux';

import ConnectedCounter from './components/Counter';
import { store, anotherStore } from './store/counterStore';

//两个Provider，并且分别传入了不同store，则其渲染的组件使用的state都是独立的
function ProviderWrap(props) {
    return (
        <div>
            <Provider store={store} >
                <ConnectedCounter />
            </Provider>
            <Provider store={anotherStore} >
                <ConnectedCounter />
            </Provider>
        </div>
    );
}

render(
    <ProviderWrap />,
    document.getElementById('root')
);