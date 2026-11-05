import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import {webReader} from './lib/webReader';
if (!window.readerAPI) window.readerAPI = webReader;
import './styles.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
