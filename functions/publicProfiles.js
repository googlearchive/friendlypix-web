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
const latinize = require('latinize');
const admin = require('firebase-admin');
const https = require('https');
try {
  admin.initializeApp();
} catch (e) {}

/**
 * Update all profiles for all users.
 */
exports.updateAllProfiles = functions.https.onCall((data, context) => {
  if (context.auth.token.admin) {
    return updateAllFacebookBadProfilesPics();
  }
  return null;
});

/**
 * Update the profile of newly created users.
 */
exports.createPublicProfile = functions.auth.user().onCreate((user) => {
  return admin.database().ref().update(buildProfileUpdate(user));
});

/**
 * Caches the Facebook profile pics to avoid URL expiry issues.
 */
exports.cacheFacebookProfilePic = functions.database.ref('/people/{uid}/profile_picture').onWrite((change, context) => {
  if (change.after.exists() && change.after.val().indexOf('facebook.com') !== -1) {
    const file = admin.storage().bucket().file(`/${context.params.uid}/profilePic.jpg`);
    const uploadStream = file.createWriteStream({contentType: 'image/jpeg'});
    https.get(change.after.val(), (response) => {
      response.pipe(uploadStream);
    });
    return new Promise((resolve, reject) => uploadStream.on('finish', resolve).on('error', reject)).then(() => {
      console.log('Facebook Profile Pic cached.');
      const config = {
        action: 'read',
        expires: '03-01-2500',
      };
      return file.getSignedUrl(config);
    }).then((urls) => {
      console.log('Signed URL generated.', urls[0]);
      return Promise.all([
        admin.auth().updateUser(context.params.uid, {photoURL: urls[0]}),
        change.after.ref.set(urls[0]),
      ]);
    }).then(() => {
      console.log('Profile Pic URL changed.');
      return null;
    });
  }
  return null;
});

/**
 * Returns the public profile data.
 */
function buildProfileUpdate(user) {
  let imageUrl = user.photoURL;
  let displayName = user.displayName;

  if (!displayName) {
    displayName = 'Anonymous';
  }

  let searchFullName = displayName.toLowerCase();
  let searchReversedFullName = searchFullName.split(' ').reverse().join(' ');
  try {
    searchFullName = latinize(searchFullName);
    searchReversedFullName = latinize(searchReversedFullName);
  } catch (e) {
    console.error(e);
  }

  const updateData = {};
  if (imageUrl) {
    updateData[`/people/${user.uid}/profile_picture`] = imageUrl;
  }
  updateData[`/people/${user.uid}/full_name`] = displayName;
  updateData[`/people/${user.uid}/_search_index`] = {
    full_name: searchFullName,
    reversed_full_name: searchReversedFullName,
  };

  return updateData;
}

/**
 * Returns an update for the Facebook Profile pic.
 */
function updateFacebookProfilePic(user) {
  let imageUrl = user.photoURL;
  let promise = Promise.resolve();
  const updateData = {};

  if (imageUrl && (imageUrl.indexOf('lookaside.facebook.com') !== -1 || imageUrl.indexOf('fbcdn.net') !== -1)) {
    // Fid the user's Facebook UID.
    const facebookUID = user.providerData.find((providerData) => providerData.providerId === 'facebook.com').uid;
    imageUrl = `https://graph.facebook.com/${facebookUID}/picture?type=large`;
    promise = admin.auth().updateUser(user.uid, {photoURL: imageUrl}).then(() => {
      console.log('User profile updated for UID', user.uid);
    });
    updateData[`/people/${user.uid}/profile_picture`] = imageUrl;
  }

  return {updateData, promise};
}

/**
 * Update all bad facebook profile pics by batches of 100.
 */
function updateAllFacebookBadProfilesPics(pageToken = undefined, count = 0) {
  const promises = [];
  return admin.auth().listUsers(10, pageToken).then((result) => {
    pageToken = result.pageToken;
    const updates = {};

    result.users.forEach((user) => {
      const data = updateFacebookProfilePic(user);
      promises.push(data.promise);
      for (const key in data.updateData) {
        if (data.updateData.hasOwnProperty(key)) {
          updates[key] = data.updateData[key];
        }
      }
    });
    count += 10;
    console.log(`Update ready for 10 users. Total processed: ${count}`);
    return updates;
  }).then((updates) => {
    return admin.database().ref().update(updates);
  }).then(() => {
    return Promise.all(promises);
  }).then(() => {
    if (pageToken) {
      return updateAllFacebookBadProfilesPics(pageToken, count);
    }
    return null;
  }).catch((error) => {
    throw new functions.https.HttpsError('unknown', error.message, error);
  });
}
