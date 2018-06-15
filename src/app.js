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
import Feed from './Feed';
import IpFilter from './IpFilter';
import MessagingHelper from './MessagingHelper';
import Post from './Post';
import Search from './Search';
import Uploader from './Uploader';
import FirebaseHelper from './FirebaseHelper';
import PrivacySettings from './PrivacySettings';
import UserPage from './UserPage';
import Router from './Router';
import * as analytics from 'universal-ga';
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
  const firebaseHelper = new FirebaseHelper();
  const privacySettings = new PrivacySettings(firebaseHelper);
  const auth = new Auth(firebaseHelper, privacySettings);
  const post = new Post(firebaseHelper);
  const messagingHelper = new MessagingHelper(firebaseHelper);
  new Uploader(firebaseHelper);
  new Search(firebaseHelper);
  const userPage = new UserPage(firebaseHelper, messagingHelper);
  const feed = new Feed(firebaseHelper);

  // Starts the router.
  window.fpRouter = new Router(userPage, feed, post, auth);
});

// Register the Service Worker that enables offline.
if ('serviceWorker' in navigator) {
  // Use the window load event to keep the page load performant
  $(window).on('load', () => {
    window.navigator.serviceWorker.register('/workbox-sw.js');
  });
}

// Initializae Google Analytics.
analytics.initialize('UA-25993200-10');
