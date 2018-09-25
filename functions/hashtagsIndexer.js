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
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
try {
  admin.initializeApp();
} catch (e) {}

/**
 * Adds an index when posts are created with hashtags.
 */
exports.addHashtagsIndex = functions.database.ref('/posts/{postId}/text').onCreate(async (snap, context) => {
  const postText = snap.val();

  // Find all hashtags in the post's text.
  const hashtags = getHashtags(postText);

  if (hashtags.length > 0) {
    // Adds the post to all the hashtags indexes.
    const postId = context.params.postId;
    const updates = {};
    hashtags.forEach((hashtag) => {
      updates[`hashtags/${hashtag}/${postId}`] = true;
    });
    return admin.database().ref().update(updates);
  }
});

/**
 * Removes an index when posts with hashtags are deleted.
 */
exports.removeHashtagsIndex = functions.database.ref('/posts/{postId}/text').onDelete(async (snap, context) => {
  const postText = snap.val();

  // Find all hashtags in the post's text.
  const hashtags = getHashtags(postText);

  if (hashtags.length > 0) {
    // Adds the post to all the hashtags indexes.
    const postId = context.params.postId;
    const updates = {};
    hashtags.forEach((hashtag) => {
      updates[`hashtags/${hashtag}/${postId}`] = null;
    });
    return admin.database().ref().update(updates);
  }
});

// Returns an array of all the hashtags in the given string.
function getHashtags(text) {
  const hashtags = [];
  text.replace(/#/g, ' #').split(/[^a-z0-9#_-]+/i).forEach((word) => {
    if (word.startsWith('#')) {
      hashtags.push(word.substring(1).toLowerCase());
    }
  });
  return hashtags; 
}
