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
const Mailgun = require('mailgun-js');
let mailgun;
try {
  mailgun = new Mailgun({apiKey: functions.config().mailgun.key, domain: functions.config().mailgun.domain});
} catch (e) {
  console.error('You have not configured the Mailgun API Key and domain. Email sending is disabled.');
}
const projectID = process.env.GCLOUD_PROJECT;

/**
 * Sends an email to the admin group every time a comment or post has been flagged for inappropriate content.
 */
exports.sendEmailOnCommentReport = functions.database.ref('/commentFlags/{postId}/{commentId}/{uid}').onCreate(sendEmail);
exports.sendEmailOnPostReport = functions.database.ref('/postFlags/{postId}/{uid}').onCreate(sendEmail);

async function sendEmail(snap, context) {
  const postId = context.params.postId;
  const commentId = context.params.commentId;
  const uid = context.params.uid;

  const userURL = 'https://friendly-pix.com/user/' + uid;
  const webURL = `https://friendly-pix.com/post/${postId}`;
  const postConsoleURL = `https://console.firebase.google.com/project/${projectID}/database/${projectID}/data/posts/${postId}`;
  const commentConsoleUrl = `https://console.firebase.google.com/project/${projectID}/database/${projectID}/data/comments/${postId}/${commentId}`;
  const ref = commentId ? `/comments/${postId}/${commentId}` : `/posts/${postId}`;

  const responses = Promise.all([admin.database().ref(ref).once('value'), admin.auth().getUser(uid)]);
  const reportedData = responses[0].val();
  const user = responses[1];
  const data = {
    from: `FriendlyPix Bot <bot@${functions.config().mailgun.domain}>`,
    to: 'friendlypix-team@google.com',
    subject: `A ${commentId ? 'comment' : 'post'} has been flagged for inappropriate content - ${commentId ? commentId : postId}`,
    text: 'Please Enable HTML Email viewing.',
    html: `Hey FriendlyPix Team,<br><br>

          The user <a href="${userURL}">${user.displayName} ${user.email ? `(${user.email})` : ''}</a>
          has flagged a ${commentId ? 'comment' : 'post'} on FriendlyPix.
          Make sure to review it asap:<br><br>
          
          Post URL on the Web (admin page): ${webURL}<br>
          ${commentId ? 'Comment' : 'Post'} console URL: ${commentId ? commentConsoleUrl : postConsoleURL}<br>
          ${commentId ? '' : `Post image thumbnail: <br>
              <a href="${reportedData.thumb_url}"><img style="max-width: 400px" src="${reportedData.thumb_url}"></a><br>`}
          Text of the ${commentId ? 'comment' : 'post'} reported: <b>${reportedData.text}</b>`,
  };

  if (mailgun) {
    return new Promise((resolve, reject) => {
      mailgun.messages().send(data, (error, body) => {
        if (error) {
          reject(error);
        } else {
          resolve(body.message);
        }
      });
    });
  }
  console.error('Some content was flagged for review but the notification email couldn\'t be sent because the ' +
      'Mailgun API credentials were not setup. Flagged content details:', data);
}
