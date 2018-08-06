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
const promisePool = require('es6-promise-pool');
const PromisePool = promisePool.PromisePool;
const secureCompare = require('secure-compare');
// Maximum concurrent posts and accounts deletions.
const MAX_CONCURRENT = 3;
try {
  admin.initializeApp();
} catch (e) {}

/**
 * When a user is deleted we delete all its personal data.
 */
exports.cleanupAccount = functions.runWith({memory: '2GB', timeoutSeconds: 540}).auth.user().onDelete((user) => {
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
      .then((snap) => {
        snap.forEach((post) => {
          personalPaths[`/posts/${post.key}`] = null;
        });
      });

  // Find all likes to delete.
  const findLikes = admin.database().ref('/likes/').orderByChild(deletedUid).startAt(0).once('value')
      .then((snap) => {
        snap.forEach((post) => {
          personalPaths[`/likes/${post.key}/${deletedUid}`] = null;
        });
      });

  // Find all comments to delete.
  const findComments = admin.database().ref('/comments/').once('value').then((commentsSnap) => {
    const allPostsPromises = [];
    commentsSnap.forEach((commentList) => {
      const checkPostComments = commentList.ref.orderByChild('author/uid').equalTo(deletedUid).once('value').then((snap) => {
        if (snap.exists()) {
          personalPaths[`/comments/${commentList.key}/${snap.key}`] = null;
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

/**
 * Automatically delete all posts that are > 30 days old.
 */
exports.deleteOldPosts = functions.runWith({memory: '2GB', timeoutSeconds: 540}).https.onRequest(async (req, res) => {
  const key = req.query.key;

  // Exit if the keys don't match.
  if (!secureCompare(key, functions.config().cron.key)) {
    console.log('The key provided in the request does not match the key set in the environment. Check that', key,
        'matches the cron.key attribute in `firebase env:get`');
    res.status(403).send('Security key does not match. Make sure your "key" URL query parameter matches the ' +
        'cron.key environment variable.');
    return null;
  }

  const nbPostsDeleted = await deleteOldPosts();
  console.log(`${nbPostsDeleted} old posts deleted`);
  res.send(`${nbPostsDeleted} old posts deleted`);
});

async function deleteOldPosts() {
  const timestampThreshold = Date.now() - 2592000000; // 30 * 24 * 3600 * 1000
  const snap = await admin.database().ref('/posts').orderByChild('timestamp').endAt(timestampThreshold).once('value');
  const oldPosts = [];

  snap.forEach((postSnap) => {
    if (postSnap.val().author) {
      oldPosts.push({
        postId: postSnap.key,
        picStorageUri: postSnap.val().picStorageUri,
        thumbStorageUri: postSnap.val().thumbStorageUri,
        authorUid: postSnap.val().author.uid,
      });
    }
  });

  console.log('Number of old posts to delete:', oldPosts.length);

  const promisePool = new PromisePool(() => deletePost(oldPosts), MAX_CONCURRENT);
  await promisePool.start();
  return oldPosts.length;
}

function deletePost(oldPosts) {
  if (oldPosts.length === 0) {
    return null;
  }

  const oldPost = oldPosts.pop();

  const postId = oldPost.postId;
  const picStorageUri = oldPost.picStorageUri;
  const thumbStorageUri = oldPost.thumbStorageUri;
  const authorUid = oldPost.authorUid;

  console.log(`Deleting ${postId}`);
  const updateObj = {};
  updateObj[`/people/${authorUid}/posts/${postId}`] = null;
  updateObj[`/comments/${postId}`] = null;
  updateObj[`/likes/${postId}`] = null;
  updateObj[`/posts/${postId}`] = null;
  updateObj[`/feed/${authorUid}/${postId}`] = null;
  const deleteFromDatabase = admin.database().ref().update(updateObj);

  if (picStorageUri) {
    const picFileName = picStorageUri;
    const thumbFileName = thumbStorageUri;
    if (picStorageUr.startsWith('gs:/')) {
      picFileName = picStorageUri.split('appspot.com/')[1];
      thumbFileName = thumbStorageUri.split('appspot.com/')[1];
    }
    const deletePicFromStorage = admin.storage().bucket().file(picFileName).delete();
    const deleteThumbFromStorage = admin.storage().bucket().file(thumbFileName).delete();
    return Promise.all([deleteFromDatabase, deletePicFromStorage, deleteThumbFromStorage]);
  }
  return deleteFromDatabase.catch((error) => {
    console.error('Deletion of old post', postId, 'failed:', error);
    return null;
  });
}

/**
 * When requested this Function will delete every user accounts that has been inactive for 30 days.
 * The request needs to be authorized by passing a 'key' query parameter in the URL. This key must
 * match a key set as an environment variable using `firebase functions:config:set cron.key="YOUR_KEY"`.
 */
exports.deleteInactiveAccounts = functions.runWith({memory: '2GB', timeoutSeconds: 540}).https.onRequest(async (req, res) => {
  const key = req.query.key;

  // Exit if the keys don't match.
  if (!secureCompare(key, functions.config().cron.key)) {
    console.log('The key provided in the request does not match the key set in the environment. Check that', key,
        'matches the cron.key attribute in `firebase env:get`');
    res.status(403).send('Security key does not match. Make sure your "key" URL query parameter matches the ' +
        'cron.key environment variable.');
    return null;
  }

  // Fetch all user details.
  const inactiveUsers = await getInactiveUsers();
  const nbAccounts = inactiveUsers.length;
  console.log('Number of inactive users to delete:', nbAccounts);

  // Use a pool so that we delete maximum `MAX_CONCURRENT` users in parallel.
  const promisePool = new PromisePool(() => deleteInactiveUser(inactiveUsers), MAX_CONCURRENT);
  await promisePool.start();
  console.log(`${nbAccounts} accountsDeleted`);
  res.send(`${nbAccounts} accountsDeleted`);
});

/**
 * Deletes one inactive user from the list.
 */
function deleteInactiveUser(inactiveUsers) {
  if (inactiveUsers.length > 0) {
    const userToDelete = inactiveUsers.pop();

      return admin.auth().deleteUser(userToDelete.uid).then(() => {
        console.log('Deleted user account', userToDelete.uid, 'because of inactivity');
      }).catch((error) => {
        console.error('Deletion of inactive user account', userToDelete.uid, 'failed:', error);
      });
  } else {
    return null;
  }
}

/**
 * Returns the list of all inactive users.
 */
async function getInactiveUsers(users = [], nextPageToken) {
  const result = await admin.auth().listUsers(1000, nextPageToken);
  // Find users that have not signed in in the last 30 days.
  const inactiveUsers = result.users.filter(
      (user) => Date.parse(user.metadata.lastSignInTime) < (Date.now() - 2592000000 /* 30 * 24 * 3600 * 1000 */));

  // Concat with list of previously found inactive users if there was more than 1000 users.
  users = users.concat(inactiveUsers);

  // If there are more users to fetch we fetch them.
  if (result.pageToken) {
    return getInactiveUsers(users, result.pageToken);
  }

  return users;
}
