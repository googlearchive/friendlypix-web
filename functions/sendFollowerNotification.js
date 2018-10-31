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
 * Triggers when a user gets a new follower and sends notifications if the user has enabled them.
 * Also avoids sending multiple notifications for the same user by keeping a timestamp of sent notifications.
 */
exports.default = functions.database.ref('/followers/{followedUid}/{followerUid}').onWrite(
    async (change, context) => {
      const followerUid = context.params.followerUid;
      const followedUid = context.params.followedUid;
      // If un-follow we exit the function.
      if (!change.after.val()) {
        return console.log('User ', followerUid, 'un-followed user', followedUid);
      }
      const followedUserRef = admin.database().ref(`people/${followedUid}`);
      console.log('We have a new follower UID:', followerUid, 'for user:', followerUid);

      // Check if the user has notifications enabled.
      const enabledSnap = await followedUserRef.child('/notificationEnabled').once('value');
      const notificationsEnabled = enabledSnap.val();
      if (!notificationsEnabled) {
        console.log('The user has not enabled notifications.');
        return;
      }
      console.log('User has notifications enabled.');

      // Check if we already sent that notification.
      const snap = await followedUserRef.child(`/notificationsSent/${followerUid}`).once('value');
      if (snap.val()) {
        return console.log('Already sent a notification to', followedUid, 'for this follower.');
      }
      console.log('Not yet sent a notification to', followedUid, 'for this follower.');

      // Get the list of device notification tokens.
      const getNotificationTokensPromise = followedUserRef.child('notificationTokens').once('value');

      // Get the follower profile.
      const getFollowerProfilePromise = admin.auth().getUser(followerUid);

      const results = await Promise.all([getNotificationTokensPromise, getFollowerProfilePromise]);
      const tokensSnapshot = results[0];
      const follower = results[1];

      // Check if there are any device tokens.
      if (!tokensSnapshot.hasChildren()) {
        return console.log('There are no notification tokens to send to.');
      }
      console.log('There are', tokensSnapshot.numChildren(), 'tokens to send notifications to.');
      console.log('Fetched follower profile', follower);
      const displayName = follower.displayName;
      const profilePic = follower.photoURL;

      // Notification details.
      const payload = {
        notification: {
          title: 'You have a new follower!',
          body: `${displayName} is now following you.`,
          icon: profilePic || '/images/silhouette.jpg',
          click_action: `https://friendly-pix.com/user/${followerUid}`,
        },
      };

      // Listing all device tokens of the user to notify.
      const tokens = Object.keys(tokensSnapshot.val());

      // Saves the flag that this notification has been sent.
      const setNotificationsSentTask = followedUserRef.child(`/notificationsSent/${followerUid}`)
          .set(admin.database.ServerValue.TIMESTAMP).then(() => {
            console.log('Marked notification as sent.');
          });

      // Send notifications to all tokens.
      const notificationPromise = admin.messaging().sendToDevice(tokens, payload).then(
          (response) => removeBadTokens(response, tokens));

      return Promise.all([notificationPromise, setNotificationsSentTask]);
    });

// Given a response object from the FCM API, remove all invalid tokens.
async function removeBadTokens(response, tokens) {
  // For each message check if there was an error.
  const tokensToRemove = {};
  response.results.forEach((result, index) => {
    const error = result.error;
    if (error) {
      // Cleanup the tokens who are not registered anymore.
      if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered') {
        console.log('The following token is not registered anymore', tokens[index]);
        tokensToRemove[`/people/${followedUid}/notificationTokens/${tokens[index]}`] = null;
      } else {
        console.error('Failure sending notification to', tokens[index], error);
      }
    }
  });
  // If there are tokens to cleanup.
  const nbTokensToCleanup = Object.keys(tokensToRemove).length;
  if (nbTokensToCleanup > 0) {
    await admin.database().ref().update(tokensToRemove);
    console.log(`Removed ${nbTokensToCleanup} unregistered tokens.`);
  }
  console.log(`Successfully sent ${tokens.length - nbTokensToCleanup} notifications.`);
}
