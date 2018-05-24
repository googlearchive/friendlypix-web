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
const sanitizer = require('./sanitizer');
const admin = require('firebase-admin');
try {
  admin.initializeApp();
} catch (e) {}

/**
 * Moderates comments and posts text by lowering all uppercase messages and removing swearwords.
 */
exports.moderateComments = functions.database.ref('/comments/{postId}/{commentId}').onWrite(moderateText);
exports.moderatePosts = functions.database.ref('/posts/{postId}').onWrite(moderateText);

function moderateText(change) {
  const snap = change.after;
  const comment = snap.val();

  if (comment && !comment.sanitized) {
    // Retrieved the message values.
    console.log('Retrieved comment content: ', comment);

    // Run moderation checks on on the message and moderate if needed.
    const moderatedMessage = sanitizer.sanitizeText(comment.text);

    // Update the Firebase DB with checked message.
    console.log('Message has been moderated. Saving to DB: ', moderatedMessage);
    return snap.ref.update({
      text: moderatedMessage,
      sanitized: true,
      moderated: comment.text !== moderatedMessage,
    });
  }
  return null;
}
