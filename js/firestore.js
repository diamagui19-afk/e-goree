//import { collection, getDocs } from "firebase/firestore";
//import { db } from "./firebase";

//export async function getLieux() {
 // try {
   // const snapshot = await getDocs(collection(db, "lieux"));

    //const lieux = snapshot.docs.map((doc) => ({
    //  id: doc.id,
      //...doc.data()
    //}));

    //console.log("Lieux récupérés :", lieux);

 //   return lieux;
  //} catch (error) {
  //  console.error("Erreur Firestore :", error);
   // return [];
//  }
//}

import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { db } from "./firebase.js";

export async function getLieux() {
    try {
        const snapshot = await getDocs(collection(db, "lieux"));

        const lieux = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log("✅ Lieux récupérés depuis Firestore :", lieux);

        return lieux;

    } catch (error) {
        console.error("❌ Erreur Firestore :", error);
        return [];
    }
}