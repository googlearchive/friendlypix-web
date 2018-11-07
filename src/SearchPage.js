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
 * Handles the Hashtags Search UI.
 */
export default class SearchPage {
  /**
   * Initializes the Hashtags Search UI.
   * @constructor
   */
  constructor(firebaseHelper) {
    this.firebaseHelper = firebaseHelper;

    // DOM Elements.
    this.searchPage = $('#page-search');
    this.hashtag = $('.fp-hashtag', this.searchPage);
    this.noPosts = $('.fp-no-posts', this.searchPage);
    this.nextPageButton = $('.fp-next-page-button button', this.searchPage);
    this.searchPageImageContainer = $('.fp-image-container', this.searchPage);
  }

  /**
   * Displays the posts containing the given hashtag.
   */
  async loadHashtag(hashtag) {
    this.hashtag.text('#' + hashtag);

    // Listen for posts deletions.
    this.firebaseHelper.registerForPostsDeletion((postId) =>
        $(`.fp-post-${postId}`, this.searchPage).remove());

    // Display hashtags posts.
    const data = await this.firebaseHelper.getHastagsPosts(hashtag);
    // Reset the UI.
    this.clear();
    
    const postIds = Object.keys(data.entries);
    if (postIds.length === 0) {
      this.noPosts.show();
    }
    this.firebaseHelper.subscribeToHashtagFeed(hashtag, (postId, postValue) => {
      this.searchPageImageContainer.prepend(
          this.createImageCard(postId, postValue.thumb_url, postValue.text));
      this.noPosts.hide();
    }, postIds[postIds.length - 1]);

    // Adds fetched posts and next page button if necessary.
    this.addPosts(data.entries);
    this.toggleNextPageButton(data.nextPage);
  }

  /**
   * Adds the list of posts to the UI.
   */
  addPosts(posts) {
    const postIds = Object.keys(posts);
    for (let i = postIds.length - 1; i >= 0; i--) {
      this.searchPageImageContainer.append(
          this.createImageCard(postIds[i],
              posts[postIds[i]].thumb_url || posts[postIds[i]].url, posts[postIds[i]].text));
      this.noPosts.hide();
    }
  }

  /**
   * Shows the "load next page" button and binds it the `nextPage` callback. If `nextPage` is `null`
   * then the button is hidden.
   */
  toggleNextPageButton(nextPage) {
    if (nextPage) {
      this.nextPageButton.show();
      this.nextPageButton.unbind('click');
      this.nextPageButton.prop('disabled', false);
      this.nextPageButton.click(async () => {
        this.nextPageButton.prop('disabled', true);
        const data = await nextPage();
        this.addPosts(data.entries);
        this.toggleNextPageButton(data.nextPage);
      });
    } else {
      this.nextPageButton.hide();
    }
  }

  /**
   * Clears the UI and listeners.
   */
  clear() {
    // Removes all pics.
    $('.fp-image', this.searchPageImageContainer).remove();

    // Cancel all Firebase listeners.
    this.firebaseHelper.cancelAllSubscriptions();

    // Hides the "Load Next Page" button.
    this.nextPageButton.hide();

    // Hide the "No posts" message.
    this.noPosts.hide();
  }

  /**
   * Returns an image Card element for the image with the given URL.
   */
  createImageCard(postId, thumbUrl, text) {
    const element = $(`
        <a class="fp-image mdl-cell mdl-cell--12-col mdl-cell--4-col-tablet
                  mdl-cell--4-col-desktop mdl-grid mdl-grid--no-spacing">
            <div class="fp-overlay">
                <i class="material-icons">favorite</i><span class="likes">0</span>
                <i class="material-icons">mode_comment</i><span class="comments">0</span>
                <div class="fp-pic-text"/>
            </div>
            <div class="mdl-card mdl-shadow--2dp mdl-cell
                        mdl-cell--12-col mdl-cell--12-col-tablet mdl-cell--12-col-desktop"></div>
        </a>`);
    $('.fp-pic-text', element).text(text);
    element.attr('href', `/post/${postId}`);
    element.addClass(`fp-post-${postId}`);
    // Display the thumbnail.
    $('.mdl-card', element).css('background-image', `url("${thumbUrl.replace(/"/g, '\\"')}")`);
    // Start listening for comments and likes counts.
    this.firebaseHelper.registerForLikesCount(postId,
        (nbLikes) => $('.likes', element).text(nbLikes));
    this.firebaseHelper.registerForCommentsCount(postId,
        (nbComments) => $('.comments', element).text(nbComments));

    return element;
  }
};
