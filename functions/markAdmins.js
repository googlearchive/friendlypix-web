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
 * Mark the hardcoded list of users as admins.
 */
exports.default = functions.database.ref('/admins/{index}').onCreate(snap => {
  const adminEmail = snap.val().email;
  return admin.auth().getUserByEmail(adminEmail).then(user => {
    return admin.auth().setCustomUserClaims(user.uid, {admin: true}).then(() => {
      console.log(`User ${adminEmail} successfully marked as an admin.`);
      return snap.ref.update({email: user.email, uid: user.uid, status: 'OK', timestamp: admin.database.ServerValue.TIMESTAMP}).then(() => {
        console.log(`Timestamp saved in database for ${adminEmail}.`);
        return null;
      });
    });
  }).catch(error => {
    console.error(`There was an error marking user ${adminEmail} as an admin.`, error);
    return snap.ref.update({error: error}).then(() => {
      console.log(`Error message saved in database for ${adminEmail}.`);
      return null;
    });
  });
});

/**
 * Mark the hardcoded list of users as admins.
 */
exports.removeAdmins = functions.database.ref('/admins/{index}').onDelete(snap => {
  const adminEmail = snap.val().email;
  return admin.auth().getUserByEmail(adminEmail).then(user => {
    return admin.auth().setCustomUserClaims(user.uid, {admin: null}).then(() => {
      console.log(`User ${adminEmail} successfully unmarked as an admin.`);
      return null;
    });
  }).catch(error => {
    console.error(`There was an error un-marking user ${adminEmail} as an admin.`, error);
    return null;
  });
});
