import { render } from 'react-dom';
import { Provider } from 'react-redux';

import ConnectedCounter from './components/Counter';
import { store } from './store/counterStore';

//将Provider包裹了一层
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