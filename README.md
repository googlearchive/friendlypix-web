# Friendly Pix Web

Friendly Pix Web is a sample app demonstrating how to build a JavaScript/Web app with the Firebase Platform.

Friendly Pix is a place where you can share photos, follow friends, comment on photos...

To see it in action, have a look at [friendly-pix.com](https://friendly-pix.com)


## Few words on technology used

The Friendly Pix frontend is built using JavaScript, [Firebase](https://firebase.google.com/docs/web/setup) and jQuery.

Friendly Pix is written in ES2017 using Modules so for wide browser support the code is packed and transpiled to ES5 using [Webpack](https://webpack.js.org/). 

The Auth flow is using [Firebase-UI](https://github.com/firebase/firebaseui-web).

Javascript Runtime dependencies as well as Build and deploy dependecies are managed using [npm](http://npmjs.com/). 

Server-side micro-services are built on [Cloud Functions for Firebase](https://firebase.google.com/docs/functions).


## Create and configure your Firebase Project

1. In a console run `npm install` to install all Build/Deploy tools dependencies.
1. Create a Firebase project using the [Firebase Console](https://firebase.google.com/console).
1. Visit the **Storage** section and enable storage by clicking the **Getting Started** button.
1. Enable **Google** as a Sign in provider in **Firebase Console > Authentication > Sign in Method** tab.
1. In a console run `firebase use --add` and, when prompted, select the Firebase Project you have just created. This will make sure the Firebase CLI is configured to use your particular project.
1. [Optional] To enable the automatic inapropriate image blurring, [Enable the Cloud Vision API](https://console.cloud.google.com/apis/api/vision.googleapis.com/overview?project=_) on your project and enable Billing.
1. [Optional] To enable email notifications for flagged content, set your Mailgun API credentials using:
    ```bash
    firebase functions:config:set mailgun.domain=friendly-pix.com mailgun.key=key-XXXXXXXXXXXXXXXX
    ```
1. [Optional] To enable IP-based geolocation filters, [Enable the Geolocation API](https://console.cloud.google.com/apis/library/geolocation.googleapis.com/?project=_) and the [Geocoding API](https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com/?project=_) on your project.


## Start a local development server

You can start a local development server by running:

```bash
npm run serve
```

This will start `firebase serve` and make sure your Javascript files are transpiled automatically to ES5.

Then open [http://localhost:5000](http://localhost:5000)

> Note 1: On new projects, the Realtime Database and Cloud Storage come with default Security rules that prevent all read and writes. You'll need to deploy the security rules and Cloud Functions once first. For this run: `firebase deploy --only database,storage`

> Note 2: All Cloud Functions cannot yet be ran locally. Deploy them once first if you want these features active (such as image and text moderation). For this run: `firebase deploy --only functions`


## Deploy the app

To deploy the app run:

```bash
firebase deploy
```

Before deploying this will automatically install all runtime dependencies, transpile the Javascript code to ES5 and install Cloud Functions dependencies.
Then this deploys a new version of your code that will be served from `https://<PROJECT_ID>.firebaseapp.com`


## Admins

To make a user an admin - allowing him to delete any posts - manually add an entry to `/admins/$index/email: admin@email.com`. For instance `/admins/1/email: bob@gmail.com`.


## Mobile Apps

The [Android](https://github.com/firebase/friendlypix-android) and [iOS](https://github.com/firebase/friendlypix-ios) versions of FriendlyPix need the Cloud Functions, the Realtime Database rules and the Cloud Storage rules to be deployed to work properly. To deploy these run:

```bash
firebase deploy --only functions,database,storage
```


## Contributing

We'd love that you contribute to the project. Before doing so please read our [Contributor guide](CONTRIBUTING.md).


## License

© Google, 2011. Licensed under an [Apache-2](LICENSE) license.
