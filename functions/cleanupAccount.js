/**
 * Copyright 2016 Google Inc. All Rights Reserved.
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
 * See the License for t`he specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
try {
  admin.initializeApp();
} catch (e) {}

/**
 * When a user is deleted we delete all its personal data.
 */
exports.default = functions.auth.user().onDelete(user => {
  const deletedUid = user.uid;

  // Gather all path containing user data to delete.
  const personalPaths = {};

  // The personal feed.
  personalPaths[`/feed/${deletedUid}`] = null;

  // The list of followers.
  personalPaths[`/followers/${deletedUid}`] = null;

  // The profile.
  personalPaths[`/people/${deletedUid}`] = null;

  // Find all posts to delete.
  const findPosts = admin.database().ref('/posts/').orderByChild('author/uid').equalTo(deletedUid).once('value')
      .then(snap => {
        snap.forEach(post => {
          personalPaths[`/posts/${post.key}`] = null;
        });
      });

  // Find all likes to delete.
  const findLikes = admin.database().ref('/likes/').orderByChild(deletedUid).startAt(0).once('value')
      .then(snap => {
        snap.forEach(post => {
          personalPaths[`/likes/${post.key}/${deletedUid}`] = null;
        });
      });

  // Find all comments to delete.
  const findComments = admin.database().ref('/comments/').once('value').then(commentsSnap => {
    const allPostsPromises = [];
    commentsSnap.forEach(commentList => {
      const checkPostComments = commentList.ref.orderByChild('author/uid').equalTo(deletedUid).once('value');
      checkPostComments.then(snap => {
        if (snap.exists()) {
          personalPaths[snap.ref] = null;
        }
      });
      allPostsPromises.push(checkPostComments);
    });
    return Promise.all(allPostsPromises);
  });

  // Delete all personal Database path.
  const deleteDatabase = Promise.all([findPosts, findLikes, findComments])
      .then(() => admin.database().ref('/').update(personalPaths));

  // Delete all user's images stored in Storage.
  const deleteStorage = admin.storage().bucket().deleteFiles({prefix: `${deletedUid}/`});

  return Promise.all([deleteDatabase, deleteStorage]);
});
