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

/**
 * Triggers when a user gets a new follower and sends notifications if the user has enabled them.
 * Also avoids sending multiple notifications for the same user by keeping a timestamp of sent notifications.
 */
if (!process.env.FUNCTION_NAME || process.env.FUNCTION_NAME === 'sendFollowerNotification') {
  exports.sendFollowerNotification = require('./sendFollowerNotification').default;
}

/**
 * When an image is uploaded we check if it is flagged as Adult or Violence by the Cloud Vision
 * API and if it is we blur it using ImageMagick.
 */
if (!process.env.FUNCTION_NAME || process.env.FUNCTION_NAME === 'blurOffensiveImages') {
  exports.blurOffensiveImages = require('./blurOffensiveImages').default;
}

/**
 * When an account is deleted we delete all the user data in the store as well.
 */
if (!process.env.FUNCTION_NAME || process.env.FUNCTION_NAME === 'cleanupAccount') {
  exports.cleanupAccount = require('./cleanupAccount').default;
}

/**
 * Moderate comments text.
 */
if (!process.env.FUNCTION_NAME || process.env.FUNCTION_NAME === 'moderateComments') {
  exports.moderateComments = require('./moderateText').moderateComments;
}

/**
 * Moderate posts text.
 */
if (!process.env.FUNCTION_NAME || process.env.FUNCTION_NAME === 'moderatePosts') {
  exports.moderatePosts = require('./moderateText').moderatePosts;
}

/**
 * Send email upon comment flag.
 */
if (!process.env.FUNCTION_NAME || process.env.FUNCTION_NAME === 'sendEmailOnCommentReport') {
  exports.sendEmailOnCommentReport = require('./sendEmailOnReport').sendEmailOnCommentReport;
}

/**
 * Send email upon post flag.
 */
if (!process.env.FUNCTION_NAME || process.env.FUNCTION_NAME === 'sendEmailOnPostReport') {
  exports.sendEmailOnPostReport = require('./sendEmailOnReport').sendEmailOnPostReport;
}

/**
 * Mark some users as admins.
 */
if (!process.env.FUNCTION_NAME || process.env.FUNCTION_NAME === 'markAdmins') {
  exports.markAdmins = require('./markAdmins').default;
}

/**
 * Unmark some users as admins.
 */
if (!process.env.FUNCTION_NAME || process.env.FUNCTION_NAME === 'removeAdmins') {
  exports.removeAdmins = require('./markAdmins').removeAdmins;
}

/**
 * Caches the Facebook profile pics to avoid URL expiry issues.
 */
// Note: disabled since we are now doing this on the client.
// if (!process.env.FUNCTION_NAME || process.env.FUNCTION_NAME === 'cacheFacebookProfilePic') {
//   exports.cacheFacebookProfilePic = require('./publicProfiles').cacheFacebookProfilePic;
// }

/**
 * Update all public profiles upon call.
 */
if (!process.env.FUNCTION_NAME || process.env.FUNCTION_NAME === 'updateAllProfiles') {
  exports.updateAllProfiles = require('./publicProfiles').updateAllProfiles;
}

/**
 * Update user's public profile when his account is created.
 */
// Note: Disabled for now as we're switching to do this on the client.
// if (!process.env.FUNCTION_NAME || process.env.FUNCTION_NAME === 'createPublicProfile') {
//   exports.createPublicProfile = require('./publicProfiles').createPublicProfile;
// }
