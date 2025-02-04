/**
 * Firebase JavaScript | Cannlytics Console
 * Created: 12/22/2020
 * Updated: 7/11/2021
 */

// Initialize Firebase
firebase.initializeApp({
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
});

// FIXME: As session cookies are to be used, do not persist any state client side.
// firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);

// Core modules
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const { firestore } = firebase;
const GoogleAuthProvider = firebase.auth.GoogleAuthProvider;

 
/*----------------------------------------------------------------------------
  Authentication interface
  ----------------------------------------------------------------------------*/

const changePhotoURL = (file) => new Promise((resolve, reject) => {
  /* 
  * Upload an image to Firebase Storage to use for a user's photo URL,
  * listening for state changes, errors, and the completion of the upload.
  */
  const uid = auth.currentUser.uid;
  const storageRef = storage.ref();
  const metadata = { contentType: 'image/jpeg' };
  const fileName = `users/${uid}/user_photos/${file.name}`;
  const uploadTask = storageRef.child(fileName).put(file, metadata);
  uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED,
    (snapshot) => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      switch (snapshot.state) {
        case firebase.storage.TaskState.PAUSED:
          break;
        case firebase.storage.TaskState.RUNNING:
          break;
      }
    }, 
    (error) => {
      reject(error);
    },
    () => {
      uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
        auth.currentUser.updateProfile({ photoURL: downloadURL });
        resolve(downloadURL);
      });
    }
  );
});


const getUserToken = (refresh=false) => new Promise((resolve, reject) => {
  /*
   * Get an auth token for a given user.
   */
  if (!auth.currentUser) {
    auth.onAuthStateChanged((user) => {
      if (user) {
        user.getIdToken(refresh).then((idToken) => {
          resolve(idToken)
        }).catch((error) => {
          reject(error);
        });
      }
    });
  } else {
    auth.currentUser.getIdToken(refresh).then((idToken) => {
      resolve(idToken)
    }).catch((error) => {
      reject(error);
    });
  }
});


const verifyUserToken = (token) => new Promise((resolve, reject) => {
  /*
   * Verify an authentication token for a given user.
   */
  auth.signInWithCustomToken(token)
    .then((userCredential) => resolve(userCredential.user))
    .catch((error) => reject(error));
});


/*----------------------------------------------------------------------------
  Firestore interface
  ----------------------------------------------------------------------------*/

const getCollection = (path, params) => new Promise((resolve) => {
  /*
   * Get documents from a collection in Firestore.
   */
  const { desc, filters=[], limit, orderBy } = params;
  let ref = getReference(path);
  filters.forEach((filter) => {
    ref = ref.where(filter.key, filter.operation, filter.value);
  });
  if (orderBy && desc) ref = ref.orderBy(orderBy, 'desc');
  else if (orderBy) ref = ref.orderBy(orderBy);
  if (limit) ref = ref.limit(limit);
  ref.get().then((snapshot) => {
    const docs = [];
    if (!snapshot) {
      resolve();
      return;
    }
    snapshot.forEach((doc) => {
      docs.push(doc.data());
    });
    resolve(docs);
  })
  // .catch((error) => {
  //   console.log('Error getting documents: ', error);
  // });
});


const getDocument = (path) => new Promise((resolve) => {
  /*
   * Get a document from Firestore.
   */
  const ref = getReference(path);
  ref.get().then((doc) => {
    resolve(doc.data() || {});
  });
});


const getReference = (path) => {
  /*
   * Create a collection or a document Firestore reference.
   */
  let ref = db;
  const parts = path.split('/');
  parts.forEach((part, index) => {
    if (index % 2) ref = ref.doc(part);
    else ref = ref.collection(part);
  });
  return ref;
};


const updateDocument = (path, data) => new Promise((resolve, reject) => {
  /*
   * Update or create a document in Firestore.
   */
  const ref = getReference(path);
  ref.set(data, { merge: true }).then((doc) => {
    if (doc) resolve(doc.data());
    else resolve();
  })
  .catch((error) => reject(error));
});



const deleteDocument = (path) => new Promise((resolve, reject) => {
  /*
   * Delete a document from Firestore.
   */
  const ref = getReference(path);
  ref.delete().then(() => resolve())
    .catch((error) => reject(error));
});


/*----------------------------------------------------------------------------
  Storage interface
  ----------------------------------------------------------------------------*/

const getDownloadURL = (path) => new Promise((resolve, reject) => {
  /*
   * Get a download URL for a given file path.
   */
  const storageRef = storage.ref();
  storageRef.child(path).getDownloadURL()
  .then((url) => resolve(url))
  .catch((error) => reject(error));

});


// TODO: Combine uploadImage with uploadFile
const uploadImage = (path, data) => new Promise((resolve) => {
  /*
   * Upload an image to Firebase Storage given it's full destination path and 
   * the image as a data URL.
   */
  const storageRef = storage.ref();
  const ref = storageRef.child(path);
  ref.putString(data, 'data_url').then((snapshot) => {
    resolve(snapshot);
  });
});


const uploadFile = (path, file) => new Promise((resolve, reject) => {
  /*
   * Upload an image to Firebase Storage given it's full destination path and 
   * the image as a data URL.
   */
  const storageRef = storage.ref();
  const ref = storageRef.child(path);
  ref.put(file).then((snapshot) => resolve(snapshot))
    .catch((error) => reject(error));
});


const deleteFile = (path) => new Promise((resolve, reject) => {
  /*
   * Upload an image to Firebase Storage given it's full destination path and 
   * the image as a data URL.
   */
  const storageRef = storage.ref();
  const ref = storageRef.child(path);
  ref.delete().then(() => resolve())
    .catch((error) => reject(error));
});


const downloadFile = async (ref, fileName) => {
  /*
   * Download a file given a path or a URL.
   */
  console.log(ref, fileName);
  if (!ref.startsWith('http')) ref = await getDownloadURL(ref);
  const response = await fetch(ref);
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.style = 'display: none';
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(blob);
};


const storageErrors = {
  'storage/unknown':	'An unknown error occurred.',
  'storage/object-not-found':	'No file exists at the desired reference.',
  'storage/bucket-not-found':	'Improper storage configuration.',
  'storage/project-not-found':	'Project is not configured for Cloud Storage.',
  'storage/quota-exceeded':	"Your storage quota has been exceeded. If you're on the free tier, upgrade to a paid plan. If you're on a paid plan, reach out to Cannlytics support.",
  'storage/unauthenticated':	'Unauthenticated, please authenticate and try again.',
  'storage/unauthorized':	"You are not authorized to perform the desired action, check your privileges to ensure that they are correct.",
  'storage/retry-limit-exceeded':	"The operation took too long to complete. Please try uploading again.",
  'storage/invalid-checksum':	"There is an error with the file. Please try uploading again.",
  'storage/canceled':	'Operation canceled.',
  'storage/invalid-url': "Invalid URL name.",
  'storage/cannot-slice-blob': "Your local file may have changed. Please try uploading again after verifying that the file hasn't changed.",
  'storage/server-file-wrong-size':	"Your file is too large. Please try uploading a different file.",
};


export {
  auth,
  db,
  firestore,
  storageErrors,
  GoogleAuthProvider,
  changePhotoURL,
  deleteDocument,
  deleteFile,
  downloadFile,
  getCollection,
  getDownloadURL,
  getUserToken,
  getDocument,
  updateDocument,
  uploadImage,
  uploadFile,
  verifyUserToken,
};
