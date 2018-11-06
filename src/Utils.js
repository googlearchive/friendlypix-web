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

/**
 * Set of utilities to handle Material Design Lite elements.
 */
export class MaterialUtils {
  /**
   * Refreshes the UI state of the given Material Design Checkbox / Switch element.
   */
  static refreshSwitchState(element) {
    const jQuery = $;
    if (element instanceof jQuery) {
      element = element[0];
    }
    if (element.MaterialSwitch) {
      element.MaterialSwitch.checkDisabled();
      element.MaterialSwitch.checkToggleState();
    }
  }

  /**
   * Closes the drawer if it is open.
   */
  static closeDrawer() {
    const drawerObfuscator = $('.mdl-layout__obfuscator');
    if (drawerObfuscator.hasClass('is-visible')) {
      drawerObfuscator.click();
    }
  }

  /**
   * Clears the given Material Text Field.
   */
  static clearTextField(element) {
    element.value = '';
    element.parentElement.MaterialTextfield.boundUpdateClassesHandler();
  }

  /**
   * Upgrades the text fields in the element.
   */
  static upgradeTextFields(element) {
    componentHandler.upgradeElements($('.mdl-textfield', element).get());
  }

  /**
   * Upgrades the dropdowns in the element.
   */
  static upgradeDropdowns(element) {
    if (element) {
      componentHandler.upgradeElements($('.mdl-js-button', element).get());
      componentHandler.upgradeElements($('.mdl-js-menu', element).get());
    } else {
      componentHandler.upgradeDom();
    }
  }

  /**
   * Returns a Promise which resolves when the user has reached the bottom of the page while
   * scrolling.
   * If an `offset` is specified the promise will resolve before reaching the bottom of
   * the page by the given amount offset in pixels.
   */
  static onEndScroll(offset = 0) {
    const resolver = new $.Deferred();
    const mdlLayoutElement = $('.mdl-layout');
    mdlLayoutElement.scroll(() => {
      if ((window.innerHeight + mdlLayoutElement.scrollTop() + offset) >=
          mdlLayoutElement.prop('scrollHeight')) {
        console.log('Scroll End Reached!');
        mdlLayoutElement.unbind('scroll');
        resolver.resolve();
      }
    });
    console.log('Now watching for Scroll End.');
    return resolver.promise();
  }

  /**
   * Stops scroll listeners.
   */
  static stopOnEndScrolls() {
    const mdlLayoutElement = $('.mdl-layout');
    mdlLayoutElement.unbind('scroll');
  }

  /**
   * Shows the Snackbar.
   */
  static showSnackbar(element, data) {
    if (!element.MaterialSnackbar) {
      element = element[0];
    }
    element.MaterialSnackbar.showSnackbar(data);
  }

  /**
   * Hides the Snackbar.
   */
  static hideSnackbar(element) {
    if (!element.MaterialSnackbar) {
      element = element[0];
    }
    element.MaterialSnackbar.cleanup_();
  }
};

export class Utils {
  /**
   * Listen for the Offline
   */
  static startOfflineListener() {
    console.log('Starting Offline status tracker!');

    const updateOnlineStatus = () => {
      if (!navigator.onLine) {
        console.log('User is now Offline!');
        const data = {
          message: '⚡ You are offline',
          timeout: 100000000,
        };
        MaterialUtils.showSnackbar($('.mdl-js-snackbar'), data);
        $('.fp-disabled-when-offline').attr('disabled', 'disabled');
      } else{
        console.log('User is now Online!');
        MaterialUtils.hideSnackbar($('.mdl-js-snackbar'));
        $('.fp-disabled-when-offline').removeAttr('disabled');
      }
    };

    window.addEventListener('online',  updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
  }


  /**
   * Adds a size URL query parameter to the Google profile pic URL.
   */
  static addSizeToGoogleProfilePic(url) {
    if (url.indexOf('googleusercontent.com') !== -1 && url.indexOf('?') === -1) {
      return url + '?sz=150';
    }
    return url;
  }

  /**
   * Escapes HTML characters from String.
   */
  static escapeHtml(unsafe) {
    if (!unsafe) {
      return unsafe;
    }
    return unsafe.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  // Returns an array of all the hashtags in the given string.
  static getHashtags(text) {
    const hashtags = [];
    text.replace(/#/g, ' #').split(/[^a-z0-9#_-]+/i).forEach((word) => {
      if (word.startsWith('#')) {
        hashtags.push(word.substring(1).toLowerCase());
      }
    });
    return hashtags; 
  }
}
