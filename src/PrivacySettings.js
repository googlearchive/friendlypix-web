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
import Router from './Router';

/**
 * Handles the Privacy Settings UI.
 */
export default class PrivacySettings {
  /**
   * Initializes the user's profile UI.
   * @constructor
   */
  constructor(firebaseHelper) {
    this.firebaseHelper = firebaseHelper;

    // DOM Elements for Privacy Consent Modal
    this.privacyDialogButton = $('.privacy-dialog-link');
    this.privacyDialog = $('#privacy-dialog');
    this.privacyDialogSave = $('.privacy-save');
    this.allowDataProcessing = $('#allow-data');
    this.allowContent = $('#allow-content');
    this.allowSocial = $('#allow-social');
    this.uploadButton = $('button#add');
    this.mobileUploadButton = $('button#add-floating');

    // Event bindings for Privacy Consent Dialog
    this.privacyDialogButton.click(() => this.showPrivacyDialog());
    this.privacyDialogSave.click(() => this.savePrivacySettings());
    this.allowDataProcessing.change(() => this.toggleSubmitStates());
    // Prevent the escape key from dismissing the dialog
    this.privacyDialog.keydown((e) => {
      if (e.keyCode === 27) return false;
    });
  }

  /**
   * Sets initial state of Privacy Dialog.
   */
  showPrivacyDialog() {
    this.initializePrivacySettings();
    if (window.dialogPolyfill && !this.privacyDialog.get(0).showModal) {
      window.dialogPolyfill.registerDialog(this.privacyDialog.get(0));
    }
    this.privacyDialog.get(0).showModal();
  }

  /**
   * Disable the submit button for the privacy settings until data privacy
   * policy is agreed to.
   */
  toggleSubmitStates() {
    if (this.allowDataProcessing.is(':checked')) {
      this.privacyDialogSave.removeAttr('disabled');
    } else {
      this.privacyDialogSave.attr('disabled', true);
    }
  }

  /**
   * Fetches previously saved privacy settings if they exist and
   * enables the Submit button if user has consented to data processing.
   */
  async initializePrivacySettings() {
    const uid = firebase.auth().currentUser.uid;
    if (this.savedPrivacySettings === undefined) {
      const snapshot = await this.firebaseHelper.getPrivacySettings(uid);
      this.savedPrivacySettings = snapshot.val();
      if (this.savedPrivacySettings) {
        if (this.savedPrivacySettings.data_processing) {
          this.allowDataProcessing.prop('checked', true);
          this.privacyDialogSave.removeAttr('disabled');
        }
        if (this.savedPrivacySettings.content) {
          this.allowContent.prop('checked', true);
          this.uploadButton.removeAttr('disabled');
          this.mobileUploadButton.removeAttr('disabled');
        }
        if (this.savedPrivacySettings.social) {
          this.allowSocial.prop('checked', true);
        }
      }
    }
  }

  /**
   * Saves new privacy settings and closes the privacy dialog.
   */
  savePrivacySettings() {
    // uid of signed in user
    const uid = firebase.auth().currentUser.uid;
    const settings = {
      data_processing: this.allowDataProcessing.prop('checked'),
      content: this.allowContent.prop('checked'),
      social: this.allowSocial.prop('checked'),
    };

    this.firebaseHelper.setPrivacySettings(uid, settings);
    if (!settings.social) {
      this.firebaseHelper.removeFromSearch(uid);
    }
    this.privacyDialog.get(0).close();
    Router.reloadPage();
    this.setUploadButtonState(this.allowContent.prop('checked'));
  }

  setUploadButtonState(enabled) {
    if (enabled) {
      this.uploadButton.removeAttr('disabled');
      this.mobileUploadButton.removeAttr('disabled');
    } else {
      this.uploadButton.prop('disabled', true);
      this.mobileUploadButton.prop('disabled', true);
    }
  }
}
