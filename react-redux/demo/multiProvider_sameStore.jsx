import { render } from 'react-dom';
import { Provider } from 'react-redux';

import Counter from './components/Counter';
import { store } from './store/counterStore';

function ProviderWrap(props) {
    return (
        <div>
            <Provider store={store} >
                <Counter />
            </Provider>
            <Provider store={store} >
                <Counter />
            </Provider>
        </div>
    );
}

render(
    <ProviderWrap />,
    document.getElementById('root')
);