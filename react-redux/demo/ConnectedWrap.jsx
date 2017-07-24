import { render } from 'react-dom';
import { Provider } from 'react-redux';

import Counter from './components/Counter';
import { store } from './store/counterStore';

function ConnectedWrap(props) {
    return <Counter />;
}

function ProviderWrap(props) {
    return (
        <Provider store={store} >
            <ConnectedWrap />
        </Provider>
    );
}

render(
    <ProviderWrap />,
    document.getElementById('root')
);