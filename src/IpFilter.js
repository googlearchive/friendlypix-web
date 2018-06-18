/**
 * Copyright 2018 Google Inc. All Rights Reserved.
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

import $ from 'jquery';
import firebase from 'firebase/app';

/**
 * Detect's the user location based on IP address.
 * You can use this class to enable special features depending on the user's location.
 * For instance displaying a Cookie usage disclaimer for Europeans.
 */
export default class IpFilter {
  static get apiKey() {
    return firebase.app().options.apiKey;
  }

  static get privacyShieldCountries() {
    return ['CH', 'AT', 'IT', 'BE', 'LV', 'BG', 'LT', 'HR', 'LX', 'CY', 'MT', 'CZ', 'NL', 'DK',
        'PL', 'EE', 'PT', 'FI', 'RO', 'FR', 'SK', 'DE', 'SI', 'GR', 'ES', 'HU', 'SE', 'IE', 'GB'];
  }

  /**
   * Starts the Filter.
   */
  static filterEuCountries() {
    // Bypass the IP filter if the special has fragment is used.
    if (window.location.hash === '#noipfilter') {
      $('.fp-non-eu').removeClass('fp-non-eu');
      return;
    }

    IpFilter.findLatLonFromIP().then((latlng) => {
      IpFilter.getCountryCodeFromLatLng(latlng.lat, latlng.lng).then((countryCode) => {
        if (IpFilter.privacyShieldCountries.includes(countryCode)) {
          $('.fp-eu').removeClass('fp-eu');
        } else {
          $('.fp-non-eu').removeClass('fp-non-eu');
        }
      });
    }).catch(() => {
      $('.fp-non-eu').removeClass('fp-non-eu');
    });
  }

  static findLatLonFromIP() {
    return new Promise((resolve, reject) => {
      $.ajax({
        url: `https://www.googleapis.com/geolocation/v1/geolocate?key=${IpFilter.apiKey}`,
        type: 'POST',
        data: JSON.stringify({considerIp: true}),
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        success: (data) => {
          if (data && data.location) {
            resolve({lat: data.location.lat, lng: data.location.lng});
          } else {
            reject('No location object in geolocate API response.');
          }
        },
        error: (err) => {
          reject(err);
        },
      });
    });
  }

  static getCountryCodeFromLatLng(lat, lng) {
    return new Promise((resolve, reject) => {
      $.ajax({
        url: `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${IpFilter.apiKey}`,
        type: 'GET',
        data: JSON.stringify({considerIp: true}),
        dataType: 'json',
        success: (data) => {
          console.log('reverse geocode:', data.results[0].address_components);
          data.results.some((address) => {
            address.address_components.some((component) => {
              if (component.types.includes('country')) {
                return resolve(component.short_name);
              }
            });
          });
          reject('Country not found in location information.');
        },
        error: reject,
      });
    });
  }
};
