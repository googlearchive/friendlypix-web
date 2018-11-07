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

import MessagingHelper from './MessagingHelper';
import AuthData from './AuthData';
import Feed from './Feed';
import Post from './Post';
import Search from './Search';
import SearchPage from './SearchPage';
import Uploader from './Uploader';
import FirebaseHelper from './FirebaseHelper';
import PrivacySettings from './PrivacySettings';
import UserPage from './UserPage';

// Load the core of the app.
const firebaseHelper = new FirebaseHelper();
const privacySettings = new PrivacySettings(firebaseHelper);
const messagingHelper = new MessagingHelper(firebaseHelper);
export const post = new Post(firebaseHelper);
export const userPage = new UserPage(firebaseHelper, messagingHelper);
export const feed = new Feed(firebaseHelper);
export const searchPage = new SearchPage(firebaseHelper);
new AuthData(firebaseHelper, privacySettings);
new Uploader(firebaseHelper);
new Search(firebaseHelper);
