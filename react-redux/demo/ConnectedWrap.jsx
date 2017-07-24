import { render } from 'react-dom';
import { Provider } from 'react-redux';

import ConnectedCounter from './components/Counter';
import { store } from './store/counterStore';

//import的ConnectedCounter已经是connected过的，现在将其包一层
function ConnectedWrap(props) {
    return <ConnectedCounter />;
}

//Provider也包了一层
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