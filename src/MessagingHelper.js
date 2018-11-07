/**
 * Copyright 2015 Google Inc. All Rights Reserved.
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
import 'firebase/messaging';
import {MaterialUtils} from './Utils';
import page from 'page';

/**
 * Handles notifications.
 */
export default class Messaging {
  /**
   * Inititializes the notifications utility.
   * @constructor
   */
  constructor(firebaseHelper) {
    this.firebaseHelper = firebaseHelper;

    // Firebase SDK
    this.auth = firebase.auth();
    this.messaging = firebase.messaging();

    // DOM Elements
    this.enableNotificationsContainer = $('.fp-notifications');
    this.enableNotificationsCheckbox = $('#notifications');
    this.enableNotificationsLabel = $('.mdl-switch__label', this.enableNotificationsContainer);

    this.toast = $('.mdl-js-snackbar');

    // Event bindings
    this.enableNotificationsCheckbox.change(() => this.onEnableNotificationsChange());
    this.auth.onAuthStateChanged(() => this.trackNotificationsEnabledStatus());
    this.messaging.onTokenRefresh(() => this.saveToken());
    this.messaging.onMessage((payload) => this.onMessage(payload));
  }

  /**
   * Saves the token to the database if available. If not request permissions.
   */
  saveToken() {
    this.messaging.getToken().then((currentToken) => {
      if (currentToken) {
        return this.firebaseHelper.saveNotificationToken(currentToken).then(() => {
          console.log('Notification Token saved to database');
        });
      } else {
        this.requestPermission();
      }
    }).catch((err) => {
      console.error('Unable to get messaging token.', err);
    });
  }

  /**
   * Requests permission to send notifications on this browser.
   */
  requestPermission() {
    console.log('Requesting permission...');
    // TODO: Blackout the entire screen and show a message saying why we need the permissions.
    //       e.g. "If you would like to receive notifications on this device, grant permission above."
    this.messaging.requestPermission().then(() => {
      console.log('Notification permission granted.');
      this.saveToken();
    }).catch((err) => {
      console.error('Unable to get permission to notify.', err);
    });
  }

  /**
   * Called when the app is in focus.
   */
  onMessage(payload) {
    console.log('Notifications received.', payload);

    // If we get a notification while focus on the app
    if (payload.notification) {
      const userId = payload.notification.click_action.split('/user/')[1];

      let data = {
        message: payload.notification.body,
        actionHandler: () => page(`/user/${userId}`),
        actionText: 'Profile',
        timeout: 10000,
      };
      MaterialUtils.showSnackbar(this.toast, data);
    }
  }

  /**
   * Triggered when the user changes the "Notifications Enabled" checkbox.
   */
  onEnableNotificationsChange() {
    const checked = this.enableNotificationsCheckbox.prop('checked');
    this.enableNotificationsCheckbox.prop('disabled', true);

    return this.firebaseHelper.toggleNotificationEnabled(checked);
  }

  /**
   * Starts tracking the "Notifications Enabled" checkbox status.
   */
  trackNotificationsEnabledStatus() {
    if (this.auth.currentUser) {
      this.firebaseHelper.registerToNotificationEnabledStatusUpdate((data) => {
        this.enableNotificationsCheckbox.prop('checked', data.val() !== null);
        this.enableNotificationsCheckbox.prop('disabled', false);
        this.enableNotificationsLabel.text(data.val() ? 'Notifications Enabled' : 'Enable Notifications');
        MaterialUtils.refreshSwitchState(this.enableNotificationsContainer);

        if (data.val()) {
          this.saveToken();
        }
      });
    }
  }
};
