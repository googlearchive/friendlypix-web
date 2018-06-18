/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

import $ from 'jquery';
import firebase from 'firebase/app';
import firebaseConfig from './firebase-config.json';
import Auth from './Auth';
import IpFilter from './IpFilter';
import Router from './Router';
import 'material-design-lite';

// Styling
import 'material-design-icons/iconfont/material-icons.css';
import 'typeface-roboto/index.css';
import 'typeface-amaranth/index.css';
import 'material-design-lite/material.min.css';
import 'firebaseui/dist/firebaseui.css';
import './app.css';

// Configure Firebase.
firebase.initializeApp(firebaseConfig.result);

// Starts the IP Filter.
IpFilter.filterEuContries();

// Load the app.
$(document).ready(() => {
  // Now we'll load the rest of the app which is split to speed up initial load.
  const loadApp = () => import(/* webpackPrefetch: true */ './app');
  const auth = new Auth();
  // Starts the router.
  window.fpRouter = new Router(loadApp, auth);
});

// Register the Service Worker that enables offline.
if ('serviceWorker' in navigator) {
  // Use the window load event to keep the page load performant
  $(window).on('load', () => {
    window.navigator.serviceWorker.register('/workbox-sw.js');
  });
}

// Initialize Google Analytics.
import(/* webpackPrefetch: true */ 'universal-ga').then((analytics) => {
  analytics.initialize('UA-25993200-10');
  analytics.pageview('/');
});
