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
import Auth from './auth';
import Feed from './feed';
import IpFilter from './ipfilter';
import Messaging from './messaging';
import Post from './post';
import Search from './search';
import Uploader from './uploader';
import Firebase from './firebase';
import UserPage from './userpage';
import Router from './routing';
import * as analytics from 'universal-ga';
import 'material-design-lite';
import 'dialog-polyfill';

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
  window.friendlyPix = {};
  const friendlyPix = window.friendlyPix;
  friendlyPix.firebase = new Firebase();
  friendlyPix.auth = new Auth();
  friendlyPix.post = new Post();
  friendlyPix.messaging = new Messaging();
  friendlyPix.uploader = new Uploader();
  friendlyPix.search = new Search();
  friendlyPix.userPage = new UserPage();
  friendlyPix.feed = new Feed();

  // Starts the router.
  friendlyPix.router = new Router();
});

// Register the Service Worker that enables offline.
if ('serviceWorker' in navigator) {
  // Use the window load event to keep the page load performant
  window.addEventListener('load', () => {
    window.navigator.serviceWorker.register('/sw.js');
  });
}

// Initializae Google Analytics.
analytics.initialize('UA-25993200-10');
