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
const mkdirp = require('mkdirp-promise');
const Vision = require('@google-cloud/vision');
const vision = new Vision();
const spawn = require('child-process-promise').spawn;
const path = require('path');
const os = require('os');
const fs = require('fs');

/**
 * When an image is uploaded we check if it is flagged as Adult or Violence by the Cloud Vision
 * API and if it is we blur it using ImageMagick.
 */
exports.default = functions.runWith({memory: '2GB'}).storage.object().onFinalize(async (object) => {
  const image = {
    source: {imageUri: `gs://${object.bucket}/${object.name}`},
  };

  // Check the image content using the Cloud Vision API.
  const batchAnnotateImagesResponse = await vision.safeSearchDetection(image);
  console.log('SafeSearch results on image', batchAnnotateImagesResponse);
  const safeSearchResult = batchAnnotateImagesResponse[0].safeSearchAnnotation;
  const Likelihood = Vision.types.Likelihood;

  if (Likelihood[safeSearchResult.adult] >= Likelihood.LIKELY ||
      Likelihood[safeSearchResult.violence] >= Likelihood.LIKELY) {
    await blurImage(object.name, object.bucket, object.metadata);
    const filePathSplit = object.name.split(path.sep);
    const uid = filePathSplit[0];
    const size = filePathSplit[1]; // 'thumb' or 'full'
    const postId = filePathSplit[2];

    return refreshImages(uid, postId, size);
  }
  console.log('The image', object.name, 'has been detected as OK.');
});

/**
 * Blurs the given image located in the given bucket using ImageMagick.
 */
async function blurImage(filePath, bucketName, metadata) {
  const tempLocalFile = path.join(os.tmpdir(), filePath);
  const tempLocalDir = path.dirname(tempLocalFile);
  const bucket = admin.storage().bucket(bucketName);

  // Create the temp directory where the storage file will be downloaded.
  await mkdirp(tempLocalDir);
  // Download file from bucket.
  await bucket.file(filePath).download({destination: tempLocalFile});
  console.log('The file has been downloaded to', tempLocalFile);
  // Blur the image using ImageMagick.
  await spawn('convert', [tempLocalFile, '-channel', 'RGBA', '-blur', '0x18', tempLocalFile]);
  console.log('Blurred image created at', tempLocalFile);
  // Uploading the Blurred image.
  await bucket.upload(tempLocalFile, {
    destination: filePath,
    metadata: {metadata: metadata}, // Keeping custom metadata.
  });
  console.log('Blurred image uploaded to Storage at', filePath);
  fs.unlinkSync(tempLocalFile);
  console.log('Deleted local file', tempLocalFile);
}

/**
 * Changes the image URL slightly (add a `&blurred` query parameter) to force a refresh.
 */
async function refreshImages(uid, postId, size) {
  let app;
  try {
    // Create a Firebase app that will honor security rules for a specific user.
    const config = JSON.parse(process.env.FIREBASE_CONFIG);
    config.databaseAuthVariableOverride = {uid: uid};
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

  const deleteApp = () => app.delete().catch(() => null);

  try {
    const imageUrlRef = app.database().ref(`/posts/${postId}/${size}_url`);
    const snap = await imageUrlRef.once('value');
    const picUrl = snap.val();
    await imageUrlRef.set(`${picUrl}&blurred`);
    console.log('Blurred image URL updated.');
    await deleteApp();
  } catch (err) {
    await deleteApp();
    throw err;
  }
}
