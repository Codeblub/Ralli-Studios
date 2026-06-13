  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyAL7r5uq3wENi-xvsHCewfBct-GyiXo8kA",
    authDomain: "ralli-studios.firebaseapp.com",
    projectId: "ralli-studios",
    storageBucket: "ralli-studios.firebasestorage.app",
    messagingSenderId: "1047811229546",
    appId: "1:1047811229546:web:c284156d937deb234dc713",
    measurementId: "G-88K1VJ3VW2"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
