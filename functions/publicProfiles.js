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
const http = require('http');
try {
  admin.initializeApp();
} catch (e) {}

/**
 * Update all profiles for all users.
 */
exports.updateAllProfiles = functions.https.onCall((data, context) => {
  if (context.auth.token.admin) {
    return updateAllProfiles();
  }
  return null;
});

/**
 * Update the profile of newly created users.
 */
exports.createPublicProfile = functions.auth.user().onCreate(user => {
  return admin.database().ref().update(buildProfileUpdate(user));
});

/**
 * Caches the Facebook profile pics to avoid URL expiry issues.
 */
exports.cacheFacebookProfilePic = functions.database.ref('/people/{uid}/profile_picture').onWrite((change, context) => {
  if (change.after.exists() && change.after.val().indexOf('facebook.com') !== -1) {
    const file = admin.storage().bucket().file(`/${context.params.uid}/profilePic.jpg`);
    const uploadStream = file.createWriteStream({contentType: 'image/jpeg'});
    http.get(change.after.val(), response => {
      response.pipe(uploadStream);
    });
    return new Promise((resolve, reject) => uploadStream.on('finish', resolve).on('error', reject)).then(() => {
      console.log('Facebook Profile Pic cached.');
      const config = {
        action: 'read',
        expires: '03-01-2500'
      };
      return file.getSignedUrl(config);
    }).then(url => {
      console.log('Signed URL generated.', url);
      return Promise.all([
        admin.auth().updateUser(context.params.uid, {photoURL: url}),
        change.after.val().ref.set(url)
      ]);
    }).then(() => {
      console.log('Profile Pic URL changed.');
      return null;
    });
  }
  return null;
});

/**
 * Update all profiles by batches of 100.
 */
function updateAllProfiles(pageToken = undefined) {
  return admin.auth().listUsers(100, pageToken).then(result => {
    pageToken = result.pageToken;
    const updates = {};

    result.users.forEach(user => {
      const data = buildProfileUpdate(user);
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          updates[key] = data[key];
        }
      }
    });
    console.log('Update read for 100 users:', updates);
    return updates;
  }).then(updates => {
    return admin.database().ref().update(updates);
  }).then(() => {
    if (pageToken) {
      return updateAllProfiles(pageToken);
    }
    return null;
  }).catch(error => {
    throw new functions.https.HttpsError('unknown', error.message, error);
  });
}

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
    reversed_full_name: searchReversedFullName
  };

  return updateData;
}
