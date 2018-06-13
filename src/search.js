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
 * Handles the Friendly Pix search feature.
 */
export default class Search {
  /**
   * The minimum number of characters to trigger a search.
   * @return {number}
   */
  static get MIN_CHARACTERS() {
    return 3;
  }

  /**
   * The maximum number of search results to be displayed.
   * @return {number}
   */
  static get NB_RESULTS_LIMIT() {
    return 10;
  }

  /**
   * Initializes the Friendly Pix search bar.
   */
  constructor() {
    // DOM Elements pointers.
    this.searchField = $('#searchQuery');
    this.searchResults = $('#fp-searchResults');

    // Event bindings.
    this.searchField.keyup(() => this.displaySearchResults());
    this.searchField.focus(() => this.displaySearchResults());
    this.searchField.click(() => this.displaySearchResults());
  }

  /**
   * Display search results.
   */
  displaySearchResults() {
    const searchString = this.searchField.val().toLowerCase().trim();
    if (searchString.length >= Search.MIN_CHARACTERS) {
      window.friendlyPix.firebase.searchUsers(searchString, Search.NB_RESULTS_LIMIT).then(
          (results) => {
            this.searchResults.empty();
            const peopleIds = Object.keys(results);
            if (peopleIds.length > 0) {
              this.searchResults.fadeIn();
              $('html').click(() => {
                $('html').unbind('click');
                this.searchResults.fadeOut();
              });
              peopleIds.forEach((peopleId) => {
                const profile = results[peopleId];
                this.searchResults.append(
                    Search.createSearchResultHtml(peopleId, profile));
              });
            } else {
              this.searchResults.fadeOut();
            }
          });
    } else {
      this.searchResults.empty();
      this.searchResults.fadeOut();
    }
  }

  /**
   * Returns the HTML for a single search result
   */
  static createSearchResultHtml(peopleId, peopleProfile) {
    return `
        <a class="fp-searchResultItem fp-usernamelink mdl-button mdl-js-button" href="/user/${peopleId}">
            <div class="fp-avatar"style="background-image: url(${peopleProfile.profile_picture ||
                '/images/silhouette.jpg'})"></div>
            <div class="fp-username mdl-color-text--black">${peopleProfile.full_name}</div>
        </a>`;
  }
};
