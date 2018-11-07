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
import 'firebase/auth';

/**
 * Handles saving the user's data to the store and displaying privacy settings to new users.
 */
export default class AuthData {
  /**
   * Initializes Friendly Pix's auth.
   * Binds the auth related UI components and handles the auth flow.
   * @constructor
   */
  constructor(firebaseHelper, privacySettings) {
    this.firebaseHelper = firebaseHelper;
    this.privacySettings = privacySettings;

    // Firebase SDK
    this.auth = firebase.auth();

    // Pointers to DOM Elements
    this.uploadButton = $('button#add');
    this.mobileUploadButton = $('button#add-floating');

    this.auth.onAuthStateChanged((user) => this.onAuthStateChanged(user));
  }

  /**
   * Displays the signed-in user information in the UI or hides it and displays the
   * "Sign-In" button if the user isn't signed-in.
   */
  async onAuthStateChanged(user) {
    if (user) {
      this.firebaseHelper.updatePublicProfile();
      const snapshot = await this.firebaseHelper.getPrivacySettings(user.uid);
      const settings = snapshot.val();
      // display privacy modal if there are no privacy preferences
      if (!settings) {
        this.privacySettings.showPrivacyDialog();
      } else if (settings.content === true) {
        // enable upload buttons
        this.uploadButton.prop('disabled', false);
        this.mobileUploadButton.prop('disabled', false);
      }
    }
  }
};
