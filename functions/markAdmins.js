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
 * Mark the hardcoded list of users as admins.
 */
exports.byEmail = functions.database.ref('/admins/{index}/email').onCreate(async (snap) => {
  const adminEmail = snap.val();
  try {
    const user = await admin.auth().getUserByEmail(adminEmail);
    await admin.auth().setCustomUserClaims(user.uid, {admin: true})
    console.log(`User ${adminEmail} successfully marked as an admin.`);
    await snap.ref.parent.update({
      email: user.email || null,
      uid: user.uid, status: 'OK',
      timestamp: admin.database.ServerValue.TIMESTAMP,
    });
    console.log(`Timestamp saved in database for ${adminEmail}.`);
  } catch (error) {
    console.error(`There was an error marking user ${adminEmail} as an admin.`, error);
    await snap.ref.parent.update({error: error});
    console.log(`Error message saved in database for ${adminEmail}.`);
  }
});

/**
 * Mark the hardcoded list of users as admins.
 */
exports.byId = functions.database.ref('/admins/{index}/uid').onCreate(async (snap) => {
  const uid = snap.val();
  try {
    const user = await admin.auth().getUser(uid);
    await admin.auth().setCustomUserClaims(user.uid, {admin: true});
    console.log(`User ${uid} successfully marked as an admin.`);
    await snap.ref.parent.update({
      email: user.email || null,
      uid: user.uid, status: 'OK',
      timestamp: admin.database.ServerValue.TIMESTAMP,
    });
    console.log(`Timestamp saved in database for ${uid}.`);
  } catch (error) {
    console.error(`There was an error marking user ${uid} as an admin.`, error);
    await snap.ref.parent.update({error: error});
    console.log(`Error message saved in database for ${uid}.`);
  }
});

/**
 * Mark the hardcoded list of users as admins.
 */
exports.removeAdmins = functions.database.ref('/admins/{index}').onDelete(async (snap) => {
  const adminEmail = snap.val().email;
  try {
    const user = await admin.auth().getUserByEmail(adminEmail);
    await admin.auth().setCustomUserClaims(user.uid, {admin: null});
    console.log(`User ${adminEmail} successfully unmarked as an admin.`);
  } catch(error) {
    console.error(`There was an error un-marking user ${adminEmail} as an admin.`, error);
  }
});
