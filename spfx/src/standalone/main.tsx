// Must stay first: it stops Fluent UI from loading fonts from the internet.
import './fabricConfig';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import seed from './seed.json';
import StandaloneApp from './StandaloneApp';
import { registerLocalIcons } from './icons';
import { SeedRows } from '../data/seed';

registerLocalIcons();
// The page lives as long as the tab, so there is nothing to unmount.
// eslint-disable-next-line @rushstack/pair-react-dom-render-unmount
ReactDOM.render(<StandaloneApp seed={seed as SeedRows} />, document.getElementById('root'));
