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
const mkdirp = require('mkdirp-promise');
const gcs = require('@google-cloud/storage')();
const vision = require('@google-cloud/vision')();
const spawn = require('child-process-promise').spawn;
const path = require('path');
const os = require('os');
const fs = require('fs');

/**
 * When an image is uploaded we check if it is flagged as Adult or Violence by the Cloud Vision
 * API and if it is we blur it using ImageMagick.
 */
exports.default = functions.storage.object().onChange(event => {
  const object = event.data;

  // Exit if this is a move or deletion event.
  if (object.resourceState === 'not_exists') {
    console.log('This is a deletion event.');
    return;
  }

  const image = {
    source: {imageUri: `gs://${object.bucket}/${object.name}`}
  };

  // Check the image content using the Cloud Vision API.
  return vision.safeSearchDetection(image).then(batchAnnotateImagesResponse => {
    console.log('SafeSearch results on image', batchAnnotateImagesResponse);
    const safeSearchResult = batchAnnotateImagesResponse[0].safeSearchAnnotation;

    if (safeSearchResult.adult === 'LIKELY' ||
      safeSearchResult.adult === 'VERY_LIKELY' ||
      safeSearchResult.violence === 'LIKELY' ||
      safeSearchResult.violence === 'VERY_LIKELY') {
      return blurImage(object.name, object.bucket, object.metadata).then(() => {
        const filePathSplit = object.name.split(path.sep);
        const uid = filePathSplit[0];
        const size = filePathSplit[1]; // 'thumb' or 'full'
        const postId = filePathSplit[2];

        return refreshImages(uid, postId, size);
      });
    }
  });
});

/**
 * Blurs the given image located in the given bucket using ImageMagick.
 */
function blurImage(filePath, bucketName, metadata) {
  const tempLocalFile = path.join(os.tmpdir(), filePath);
  const tempLocalDir = path.dirname(tempLocalFile);
  const bucket = gcs.bucket(bucketName);

  // Create the temp directory where the storage file will be downloaded.
  return mkdirp(tempLocalDir).then(() => {
    // Download file from bucket.
    return bucket.file(filePath).download({destination: tempLocalFile});
  }).then(() => {
    console.log('The file has been downloaded to', tempLocalFile);
    // Blur the image using ImageMagick.
    return spawn('convert', [tempLocalFile, '-channel', 'RGBA', '-blur', '0x18', tempLocalFile]);
  }).then(() => {
    console.log('Blurred image created at', tempLocalFile);
    // Uploading the Blurred image.
    return bucket.upload(tempLocalFile, {
      destination: filePath,
      metadata: {metadata: metadata} // Keeping custom metadata.
    });
  }).then(() => {
    console.log('Blurred image uploaded to Storage at', filePath);
    fs.unlinkSync(tempLocalFile);
    console.log('Deleted local file', tempLocalFile);
  });
}

/**
 * Changes the image URL slightly (add a `&blurred` query parameter) to force a refresh.
 */
function refreshImages(uid, postId, size) {
  let app;
  try {
    // Create a Firebase app that will honor security rules for a specific user.
    const config = {
      credential: functions.config().firebase.credential,
      databaseURL: functions.config().firebase.databaseURL,
      databaseAuthVariableOverride: {
        uid: uid
      }
    };
    app = admin.initializeApp(config, uid);
  } catch (e) {
    if (e.code !== 'app/duplicate-app') {
      console.error('There was an error initializing Firebase Admin', e);
      throw e;
    }
    // An app for that UID was already created so we re-use it.
    console.log('Re-using existing app.');
    app = admin.app(uid);
  }

  const imageUrlRef = app.database().ref(`/posts/${postId}/${size}_url`);
  return imageUrlRef.once('value').then(snap => {
    const picUrl = snap.val();
    return imageUrlRef.set(`${picUrl}&blurred`).then(() => {
      console.log('Blurred image URL updated.');
    });
  });
}
