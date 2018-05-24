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

window.friendlyPix = window.friendlyPix || {};

/**
 * Filters some features depending on the user location.
 */
friendlyPix.IpFilter = class {
  static get apiKey() {
    return firebase.app().options.apiKey;
  }

  // Returns a promise that resolves with true if the user is in a Privacy Shield covered country.
  get isUserInPrivacyShield() {
    return this.isPrivacyShieldCountryDeferred.promise();
  }

  // Returns a promise that resolves with true if the user is in a Privacy Shield covered country.
  get userCountry() {
    return this.userCountryDeferred.promise();
  }

  static get privacyShieldCountries() {
    return ['CH', 'AT', 'IT', 'BE', 'LV', 'BG', 'LT', 'HR', 'LX', 'CY', 'MT', 'CZ', 'NL', 'DK',
        'PL', 'EE', 'PT', 'FI', 'RO', 'FR', 'SK', 'DE', 'SI', 'GR', 'ES', 'HU', 'SE', 'IE', 'GB'];
  }

  /**
   * Initializes Friendly Pix's Ip Filter.
   * @constructor
   */
  constructor() {
    // Result in a Promise.
    this.isPrivacyShieldCountryDeferred = new $.Deferred();
    this.userCountryDeferred = new $.Deferred();

    const js = document.createElement('script');
    js.type = 'text/javascript';
    js.src = `https://maps.googleapis.com/maps/api/js?key=${friendlyPix.IpFilter.apiKey}&callback=friendlyPix.ipfilter.onScriptReady`;
    document.head.appendChild(js);

    this.isUserInPrivacyShield.then((isEu) => {
      if (isEu) {
        $('.fp-eu').removeClass('fp-eu');
      } else {
        $('.fp-non-eu').removeClass('fp-non-eu');
      }
    }, () => {
      $('.fp-non-eu').removeClass('fp-non-eu');
    });
  }

  onScriptReady() {
    // Firebase SDK
    this.geocoder = new google.maps.Geocoder;

    try {
      $.ajax({
        url: `https://www.googleapis.com/geolocation/v1/geolocate?key=${friendlyPix.IpFilter.apiKey}`,
        type: 'POST',
        data: JSON.stringify({considerIp: true}),
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        success: (data) => {
          console.log('User location:', data);
          this.geocoder.geocode({'location': {lat: data.location.lat, lng: data.location.lng}}, (results) => {
            console.log('reverse geocode:', results[0].address_components);
            let countryCode = null;
            results.some((address) => {
              address.address_components.some((component) => {
                if (component.types.includes('country')) {
                  countryCode = component.short_name;
                  return true;
                }
              });
              if (countryCode) {
                return true;
              }
            });
            console.log('Found User\'s Country Code using IP address:', countryCode);
            if (countryCode) {
              this.userCountryDeferred.resolve(countryCode);
              this.isPrivacyShieldCountryDeferred.resolve(friendlyPix.IpFilter.privacyShieldCountries.includes(countryCode));
            } else {
              throw new Error('Country not found in location information', data);
            }
          });
        },
      });
    } catch (e) {
      this.isPrivacyShieldCountryDeferred.reject(e);
      this.userCountryDeferred.reject(e);
    }
  }
};

friendlyPix.ipfilter = new friendlyPix.IpFilter();
