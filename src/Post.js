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
import MaterialUtils from './MaterialUtils';
import swal from 'sweetalert';
import page from 'page';

/**
 * Handles the single post UI.
 */
export default class Post {
  /**
   * Initializes the single post's UI.
   * @constructor
   */
  constructor(firebaseHelper, postId) {
    this.firebaseHelper = firebaseHelper;
    // List of all times running on the page.
    this.timers = [];

    // Firebase SDK.
    this.auth = firebase.auth();

    // Pointers to DOM elements.
    this.postElement = $(Post.createPostHtml(postId));
    MaterialUtils.upgradeTextFields(this.postElement);
    this.toast = $('.mdl-js-snackbar');
    this.theatre = $('.fp-theatre');

    // Adds the element to the main UI if thisis the first time this is called.
    if ($('.fp-image-container', '#page-post').children().length === 0) {
      $('.fp-image-container', '#page-post').append(this.postElement);
    }
  }

  /**
   * Loads the given post's details.
   */
  loadPost(postId) {
    // Load the posts information.
    this.firebaseHelper.getPostData(postId).then((snapshot) => {
      const post = snapshot.val();
      // Clear listeners and previous post data.
      this.clear();
      if (!post) {
        const data = {
          message: 'This post does not exists.',
          timeout: 5000,
        };
        this.toast[0].MaterialSnackbar.showSnackbar(data);
        if (this.auth.currentUser) {
          page(`/user/${this.auth.currentUser.uid}`);
        } else {
          page(`/feed`);
        }
      } else {
        this.fillPostData(snapshot.key, post.thumb_url || post.url, post.text, post.author,
            post.timestamp, post.thumb_storage_uri, post.full_storage_uri, post.full_url);
      }
    });
  }

  /**
   * Clears all listeners and timers in the given element.
   */
  clear() {
    // Stops all timers if any.
    this.timers.forEach((timer) => clearInterval(timer));
    this.timers = [];

    // Remove Firebase listeners.
    this.firebaseHelper.cancelAllSubscriptions();
  }

  /**
   * Displays the given list of `comments` in the post.
   */
  displayComments(postId, comments) {
    const commentsIds = Object.keys(comments);
    for (let i = commentsIds.length - 1; i >= 0; i--) {
      this.displayComment(comments[commentsIds[i]], postId, commentsIds[i]);
    }
  }

  /**
   * Displays a single comment or replace the existing one with new content.
   */
  displayComment(comment, postId, commentId, prepend = true) {
    const newElement = this.createComment(comment.author, comment.text, postId,
        commentId, this.auth.currentUser && comment.author.uid === this.auth.currentUser.userId);
    if (prepend) {
      $('.fp-comments', this.postElement).prepend(newElement);
    } else {
      $('.fp-comments', this.postElement).append(newElement);
    }
    MaterialUtils.upgradeDropdowns(this.postElement);

    // Subscribe to updates of the comment.
    this.firebaseHelper.subscribeToComment(postId, commentId, (snap) => {
      const updatedComment = snap.val();
      if (updatedComment) {
        const updatedElement = this.createComment(updatedComment.author,
          updatedComment.text, postId, commentId,
          this.auth.currentUser && updatedComment.author.uid === this.auth.currentUser.userId);
        const element = $('#comment-' + commentId);
        element.replaceWith(updatedElement);
      } else {
        $('#comment-' + commentId).remove();
      }
      MaterialUtils.upgradeDropdowns(this.postElement);
    });
  }

  /**
   * Shows the "show more comments" button and binds it the `nextPage` callback. If `nextPage` is
   * `null` then the button is hidden.
   */
  displayNextPageButton(postId, nextPage) {
    const nextPageButton = $('.fp-morecomments', this.postElement);
    if (nextPage) {
      nextPageButton.show();
      nextPageButton.unbind('click');
      nextPageButton.prop('disabled', false);
      nextPageButton.click(() => nextPage().then((data) => {
        nextPageButton.prop('disabled', true);
        this.displayComments(postId, data.entries);
        this.displayNextPageButton(postId, data.nextPage);
      }));
    } else {
      nextPageButton.hide();
    }
  }

  /**
   * Fills the post's Card with the given details.
   * Also sets all auto updates and listeners on the UI elements of the post.
   */
  fillPostData(postId, thumbUrl, imageText, author = {}, timestamp, thumbStorageUri, picStorageUri, picUrl) {
    const post = this.postElement;

    MaterialUtils.upgradeDropdowns(this.postElement);

    // Fills element's author profile.
    $('.fp-usernamelink', post).attr('href', `/user/${author.uid}`);
    $('.fp-avatar', post).css('background-image',
        `url(${author.profile_picture || '/images/silhouette.jpg'})`);
    $('.fp-username', post).text(author.full_name || 'Anonymous');

    // Shows the pic's thumbnail.
    this._setupThumb(thumbUrl, picUrl);

    // Make sure we update if the thumb or pic URL changes.
    this.firebaseHelper.registerForThumbChanges(postId, (thumbUrl) => {
      this._setupThumb(thumbUrl, picUrl);
    });

    if (this.auth.currentUser) {
      this.firebaseHelper.getPrivacySettings(this.auth.currentUser.uid).then((snapshot) => {
        let socialEnabled = false;
        if (snapshot.val() !== null) {
          socialEnabled = snapshot.val().social;
        }

        this._setupDate(postId, timestamp);
        this._setupDeleteButton(postId, author, picStorageUri, thumbStorageUri);
        this._setupReportButton(postId);
        this._setupLikeCountAndStatus(postId, socialEnabled);
        this._setupComments(postId, author, imageText, socialEnabled);
      });
    } else {
      this._setupDate(postId, timestamp);
      this._setupDeleteButton(postId, author, picStorageUri, thumbStorageUri);
      this._setupReportButton(postId);
      this._setupLikeCountAndStatus(postId);
      this._setupComments(postId, author, imageText);
    }

    return post;
  }

  /**
   * Leaves the theatre mode.
   */
  leaveTheatreMode() {
    this.theatre.hide();
    this.theatre.off('click');
    $(document).off('keydown');
  }

  /**
   * Leaves the theatre mode.
   */
  enterTheatreMode(picUrl) {
    $('.fp-fullpic', this.theatre).prop('src', picUrl);
    this.theatre.css('display', 'flex');
    // Leave theatre mode if click or ESC key down.
    this.theatre.off('click');
    this.theatre.click(() => this.leaveTheatreMode());
    $(document).off('keydown');
    $(document).keydown((e) => {
      if (e.which === 27) {
        this.leaveTheatreMode();
      }
    });
  }

  /**
   * Shows the thumbnail and sets up the click to see the full size image.
   * @private
   */
  _setupThumb(thumbUrl, picUrl) {
    const post = this.postElement;

    $('.fp-image', post).css('background-image', `url("${thumbUrl ? thumbUrl.replace(/"/g, '\\"') : ''}")`);
    $('.fp-image', post).unbind('click');
    $('.fp-image', post).click(() => this.enterTheatreMode(picUrl || thumbUrl));
  }

  /**
   * Shows the publishing date of the post and updates this date live.
   * @private
   */
  _setupDate(postId, timestamp) {
    const post = this.postElement;

    $('.fp-time', post).attr('href', `/post/${postId}`);
    $('.fp-time', post).text(Post.getTimeText(timestamp));
    // Update the time counter every minutes.
    this.timers.push(setInterval(
        () => $('.fp-time', post).text(Post.getTimeText(timestamp)), 60000));
  }

  /**
   * Shows comments and binds actions to the comments form.
   * @private
   */
  _setupComments(postId, author, imageText, socialEnabled = false) {
    const post = this.postElement;

    // Creates the initial comment with the post's text.
    $('.fp-first-comment', post).empty();
    $('.fp-first-comment', post).append(this.createComment(author, imageText));

    // Load first page of comments and listen to new comments.
    this.firebaseHelper.getComments(postId).then((data) => {
      $('.fp-comments', post).empty();
      this.displayComments(postId, data.entries);
      this.displayNextPageButton(postId, data.nextPage);

      // Display any new comments.
      const commentIds = Object.keys(data.entries);
      this.firebaseHelper.subscribeToComments(postId, (commentId, commentData) => {
        this.displayComment(commentData, postId, commentId, false);
      }, commentIds ? commentIds[commentIds.length - 1] : 0);
    });

    if (this.auth.currentUser && socialEnabled) {
      // Bind comments form posting.
      $('.fp-add-comment', post).off('submit');
      $('.fp-add-comment', post).submit((e) => {
        e.preventDefault();
        const commentText = $(`.mdl-textfield__input`, post).val();
        if (!commentText || commentText.length === 0) {
          return;
        }
        this.firebaseHelper.addComment(postId, commentText);
        $(`.mdl-textfield__input`, post).val('');
      });
      const ran = Math.floor(Math.random() * 10000000);
      $('.mdl-textfield__input', post).attr('id', `${postId}-${ran}-comment`);
      $('.mdl-textfield__label', post).attr('for', `${postId}-${ran}-comment`);
      // Show comments form.
      $('.fp-action', post).css('display', 'flex');
    }
  }

  /**
   * Binds the action to the report button.
   * @private
   */
  _setupReportButton(postId) {
    const post = this.postElement;

    if (this.auth.currentUser) {
      $('.fp-report-post', post).show();
      $('.fp-report-post', post).off('click');
      $('.fp-report-post', post).click(() => {
        swal({
          title: 'Are you sure?',
          text: 'You are about to flag this post for inappropriate content! An administrator will review your claim.',
          icon: 'warning',
          buttons: {
            cancel: {
              text: 'Cancel',
              value: false,
              visible: true,
              className: '',
              closeModal: true,
            },
            confirm: {
              text: 'Yes, report this post!',
              value: true,
              visible: true,
              className: '',
              closeModal: false,
            },
          },
          closeOnEsc: true,
        }).then((willReport) => {
          if (!willReport) {
            return;
          }
          $('.fp-report-post', post).prop('disabled', true);
          return this.firebaseHelper.reportPost(postId).then(() => {
            swal({
              title: 'Reported!',
              text: 'This post has been reported. Please allow some time before an admin reviews it.',
              icon: 'success',
              timer: 2000,
            });
            $('.fp-report-post', post).prop('disabled', false);
          }).catch((error) => {
            swal.close();
            $('.fp-report-post', post).prop('disabled', false);
            const data = {
              message: `There was an error reporting your post: ${error}`,
              timeout: 5000,
            };
            this.toast[0].MaterialSnackbar.showSnackbar(data);
          });
        });
      });
    }
  }

  /**
   * Shows/Hide and binds actions to the Delete button.
   * @private
   */
  _setupDeleteButton(postId, author = {}, picStorageUri, thumbStorageUri) {
    const post = this.postElement;

    if (this.auth.currentUser && this.auth.currentUser.uid === author.uid) {
      post.addClass('fp-owned-post');
    } else {
      post.removeClass('fp-owned-post');
    }

    $('.fp-delete-post', post).off('click');
    $('.fp-delete-post', post).click(() => {
      swal({
        title: 'Are you sure?',
        text: 'You are about to delete this post. Once deleted, you will not be able to recover it!',
        icon: 'warning',
        buttons: {
          cancel: {
            text: 'Cancel',
            value: false,
            visible: true,
            className: '',
            closeModal: true,
          },
          confirm: {
            text: 'Yes, delete it!',
            value: true,
            visible: true,
            className: '',
            closeModal: false,
          },
        },
        closeOnEsc: true,
      }).then((willDelete) => {
        if (!willDelete) {
          return;
        }
        $('.fp-delete-post', post).prop('disabled', true);
        return this.firebaseHelper.deletePost(postId, picStorageUri, thumbStorageUri).then(() => {
          swal({
            title: 'Deleted!',
            text: 'Your post has been deleted.',
            icon: 'success',
            timer: 2000,
          });
          $('.fp-delete-post', post).prop('disabled', false);
          page(`/user/${this.auth.currentUser.uid}`);
        }).catch((error) => {
          swal.close();
          $('.fp-delete-post', post).prop('disabled', false);
          const data = {
            message: `There was an error deleting your post: ${error}`,
            timeout: 5000,
          };
          this.toast[0].MaterialSnackbar.showSnackbar(data);
        });
      });
    });
  }

  /**
   * Starts Likes count listener and on/off like status.
   * @private
   */
  _setupLikeCountAndStatus(postId, socialEnabled = false) {
    const post = this.postElement;

    if (this.auth.currentUser && socialEnabled) {
      // Listen to like status.
      this.firebaseHelper.registerToUserLike(postId, (isliked) => {
        if (isliked) {
          $('.fp-liked', post).show();
          $('.fp-not-liked', post).hide();
        } else {
          $('.fp-liked', post).hide();
          $('.fp-not-liked', post).show();
        }
      });

      // Add event listeners.
      $('.fp-liked', post).off('click');
      $('.fp-liked', post).click(() => this.firebaseHelper.updateLike(postId, false));
      $('.fp-not-liked', post).off('click');
      $('.fp-not-liked', post).click(() => this.firebaseHelper.updateLike(postId, true));
    } else {
      $('.fp-liked', post).hide();
      $('.fp-not-liked', post).hide();
      $('.fp-action', post).hide();
    }

    // Listen to number of Likes.
    this.firebaseHelper.registerForLikesCount(postId, (nbLikes) => {
      if (nbLikes > 0) {
        $('.fp-likes', post).show();
        $('.fp-likes', post).text(nbLikes + ' like' + (nbLikes === 1 ? '' : 's'));
      } else {
        $('.fp-likes', post).hide();
      }
    });
  }

  /**
   * Returns the HTML for a post's comment.
   */
  static createPostHtml(postId = 0) {
    return `
        <div class="fp-post mdl-cell mdl-cell--12-col mdl-cell--8-col-tablet
                    mdl-cell--8-col-desktop mdl-grid mdl-grid--no-spacing">
          <div class="mdl-card mdl-shadow--2dp mdl-cell
                        mdl-cell--12-col mdl-cell--12-col-tablet mdl-cell--12-col-desktop">
            <div class="fp-header">
              <a class="fp-usernamelink mdl-button mdl-js-button" href="/user/">
                <div class="fp-avatar"></div>
                <div class="fp-username mdl-color-text--black"></div>
              </a>
              <a href="/post/" class="fp-time">now</a>
              <!-- Drop Down Menu -->
              <button class="fp-signed-in-only mdl-button mdl-js-button mdl-js-ripple-effect mdl-button--icon" id="fp-post-menu-${postId}">
                <i class="material-icons">more_vert</i>
              </button>
              <ul class="fp-menu-list mdl-menu mdl-js-menu mdl-js-ripple-effect mdl-menu--bottom-right" for="fp-post-menu-${postId}">
                <li class="mdl-menu__item fp-report-post"><i class="material-icons">report</i> Report</li>
                <li class="mdl-menu__item fp-delete-post"><i class="material-icons">delete</i> Delete post</li>
              </ul>
            </div>
            <div class="fp-image"></div>
            <div class="fp-likes">0 likes</div>
            <div class="fp-first-comment"></div>
            <div class="fp-morecomments">View more comments...</div>
            <div class="fp-comments"></div>
            <div class="fp-action">
              <span class="fp-like">
                <div class="fp-not-liked material-icons">favorite_border</div>
                <div class="fp-liked material-icons">favorite</div>
              </span>
              <form class="fp-add-comment" action="#">
                <div class="mdl-textfield mdl-js-textfield">
                  <input class="mdl-textfield__input">
                  <label class="mdl-textfield__label">Comment...</label>
                </div>
              </form>
            </div>
          </div>
        </div>`;
  }

  /**
   * Returns the HTML for a post's comment.
   */
  createComment(author = {}, text, postId, commentId, isOwner = false) {
    commentId = MaterialUtils.escapeHtml(commentId);
    try {
      const element = $(`
        <div id="comment-${commentId ? commentId : postId}" class="fp-comment${isOwner ? ' fp-comment-owned' : ''}">
          <a class="fp-author" href="/user/${author.uid}">${$('<div>').text(author.full_name || 'Anonymous').html()}</a>:
          <span class="fp-text">${$('<div>').text(text).html()}</span>
          <!-- Drop Down Menu -->
          <button class="fp-edit-delete-comment-container fp-signed-in-only mdl-button mdl-js-button mdl-js-ripple-effect mdl-button--icon" id="fp-comment-menu-${commentId}">
            <i class="material-icons">more_vert</i>
          </button>
          <ul class="fp-menu-list mdl-menu mdl-js-menu mdl-js-ripple-effect mdl-menu--top-right" for="fp-comment-menu-${commentId}">
            <li class="mdl-menu__item fp-report-comment"><i class="material-icons">report</i> Report</li>
            <li class="mdl-menu__item fp-edit-comment"><i class="material-icons">mode_edit</i> Edit</li>
            <li class="mdl-menu__item fp-delete-comment"><i class="material-icons">delete</i> Delete comment</li>
          </ul>
        </div>`);
      $('.fp-delete-comment', element).click(() => {
        if (window.confirm('Delete the comment?')) {
          this.firebaseHelper.deleteComment(postId, commentId).then(() => {
            element.text('this comment has been deleted');
            element.addClass('fp-comment-deleted');
          });
        }
      });
      $('.fp-report-comment', element).click(() => {
        if (window.confirm('Report this comment for inappropriate content?')) {
          this.firebaseHelper.reportComment(postId, commentId).then(() => {
            element.text('this comment has been flagged for review.');
            element.addClass('fp-comment-deleted');
          });
        }
      });
      $('.fp-edit-comment', element).click(() => {
        const newComment = window.prompt('Edit the comment?', text);
        if (newComment !== null && newComment !== '') {
          this.firebaseHelper.editComment(postId, commentId, newComment).then(() => {
            $('.fp-text', element).text(newComment);
          });
        }
      });
      return element;
    } catch (e) {
      console.error('Error while displaying comment', e);
    }
    return $('<div/>');
  }

  /**
   * Given the time of creation of a post returns how long since the creation of the post in text
   * format. e.g. 5d, 10h, now...
   */
  static getTimeText(postCreationTimestamp) {
    let millis = Date.now() - postCreationTimestamp;
    const ms = millis % 1000;
    millis = (millis - ms) / 1000;
    const secs = millis % 60;
    millis = (millis - secs) / 60;
    const mins = millis % 60;
    millis = (millis - mins) / 60;
    const hrs = millis % 24;
    const days = (millis - hrs) / 24;
    const timeSinceCreation = [days, hrs, mins, secs, ms];

    let timeText = 'Now';
    if (timeSinceCreation[0] !== 0) {
      timeText = timeSinceCreation[0] + 'd';
    } else if (timeSinceCreation[1] !== 0) {
      timeText = timeSinceCreation[1] + 'h';
    } else if (timeSinceCreation[2] !== 0) {
      timeText = timeSinceCreation[2] + 'm';
    }
    return timeText;
  }
};
