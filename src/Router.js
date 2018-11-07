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
import {MaterialUtils} from './Utils';
import page from 'page';

/**
 * Handles the pages/routing.
 */
export default class Router {
  /**
   * Initializes the Friendly Pix controller/router.
   * @constructor
   */
  constructor(auth) {
    this.auth = auth;

    // Dom elements.
    this.pagesElements = $('[id^=page-]');
    this.splashLogin = $('#login', '#page-splash');

    // Load the rest of the app - which is split - asynchroneously to speed up initial load.
    const loadComponents = import(/* webpackPrefetch: true */ './async-loaded-components');

    // Shortcuts to async loaded components.
    const loadUser = (userId) => loadComponents.then(({userPage}) => userPage.loadUser(userId));
    const searchHashtag = (hashtag) => loadComponents.then(({searchPage}) => searchPage.loadHashtag(hashtag));
    const showHomeFeed = () => loadComponents.then(({feed}) => feed.showHomeFeed());
    const showGeneralFeed = () => loadComponents.then(({feed}) => feed.showGeneralFeed());
    const clearFeed = () => loadComponents.then(({feed}) => feed.clear());
    const showPost = (postId) => loadComponents.then(({post}) => post.loadPost(postId));

    // Configuring middlwares.
    page(Router.setLinkAsActive);

    // Configuring routes.
    page('/', () => {this.displaySplashIfSignedOut(); this.displayPage('splash');});
    page('/home', () => {showHomeFeed(); this.displayPage('feed', true);});
    page('/recent', () => {showGeneralFeed(); this.displayPage('feed');});
    page('/post/:postId', (context) => {showPost(context.params.postId); this.displayPage('post');});
    page('/user/:userId', (context) => {loadUser(context.params.userId); this.displayPage('user-info');});
    page('/search/:hashtag', (context) => {searchHashtag(context.params.hashtag); this.displayPage('search');});
    page('/about', () => {clearFeed(); this.displayPage('about');});
    page('/terms', () => {clearFeed(); this.displayPage('terms');});
    page('/add', () => {this.displayPage('add', true);});
    page('*', () => page('/'));

    // Start routing.
    page();
  }

  /**
   * Displays the given page and hides the other ones.
   * if `onlyAuthed` is set to true then the splash page will be displayed instead of the page if
   * the user is not signed-in.
   * A "page" is the element with ID "page-<id>" in the DOM.
   */
  displayPage(pageId, onlyAuthed) {
    if (onlyAuthed) {
      // If the page can only be displayed if the user is authenticated then we wait or the auth state.
      this.auth.waitForAuth.then(() => {
        this._displayPage(pageId, onlyAuthed);
      });
    } else {
      this._displayPage(pageId, onlyAuthed);
    }
  }

  _displayPage(pageId, onlyAuthed) {
    // If the page is restricted to signed-in users and the user is not signedin, redirect to the Splasbh page.
    if (onlyAuthed && !firebase.auth().currentUser) {
      return this.auth.waitForAuth.then(() => {
        return page('/');
      });
    }

    // Display the right page and hide the other ones.
    this.pagesElements.each(function(index, element) {
      if (element.id === 'page-' + pageId) {
        $(element).show();
      } else if (element.id === 'page-splash' && onlyAuthed) {
        $(element).fadeOut(1000);
      } else {
        $(element).hide();
      }
    });

    // Force close the Drawer if opened.
    MaterialUtils.closeDrawer();

    // Scroll to top.
    Router.scrollToTop();
  }

  /**
   * Display the Splash-page if the user is signed-out.
   * Otherwise redirect to the home feed.
   */
  displaySplashIfSignedOut() {
    if (!firebase.auth().currentUser) {
      this.splashLogin.show();
    } else {
      page('/home');
    }
  }

  /**
   * Reloads the current page.
   */
  static reloadPage() {
    let path = window.location.pathname;
    if (path === '') {
      path = '/';
    }
    page(path);
  }

  /**
   * Scrolls the page to top.
   */
  static scrollToTop() {
    $('html,body').animate({scrollTop: 0}, 0);
  }

  /**
   * Page.js middleware that highlights the correct menu item/link.
   */
  static setLinkAsActive(context, next) {
    const canonicalPath = context.canonicalPath;
    if (canonicalPath === '') {
      canonicalPath = '/';
    }
    $('.is-active').removeClass('is-active');
    $(`[href="${canonicalPath}"]`).addClass('is-active');
    next();
  }
};
