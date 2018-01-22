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
try {admin.initializeApp(functions.config().firebase);} catch(e) {}

/**
 * When a user is deleted we delete all its personal data.
 */
exports.default = functions.auth.user().onDelete(event => {
  const deletedUid = event.data.uid;
  const personalPaths = {};
  personalPaths[`/feed/${deletedUid}`] = null;
  personalPaths[`/followers/${deletedUid}`] = null;
  personalPaths[`/people/${deletedUid}`] = null;

  return admin.database().ref('/posts/').orderByChild('author/uid').equalTo(deletedUid).once('value').then(snap => {
    snap.forEach(post => {
      personalPaths[`/posts/${post.key}`] = null;
    })
  }).then(() => {
    return admin.database().ref('/likes/').orderByChild(deletedUid).startAt(0).once('value').then(snap => {
      snap.forEach(post => {
        personalPaths[`/likes/${post.key}/${deletedUid}`] = null;
      })
    });
  }).then(() => {
    return admin.database().ref('/').update(personalPaths);
  });

  // TODO: delete all comments where:
  // path === /comments/${postId}/${commentId} and author/uid === ${deletedUid}
});
