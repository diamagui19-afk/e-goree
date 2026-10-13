import { auth } from "./firebase.js";

import {
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";


console.log("🔐 FORGOT-PASSWORD.JS CHARGÉ");


const emailInput =
    document.getElementById("email");

const resetButton =
    document.querySelector(".login-btn");


console.log("📧 Champ email :", emailInput);
console.log("🔘 Bouton :", resetButton);


function showMessage(message, type = "error") {

    let messageBox =
        document.getElementById("reset-message");

    if (!messageBox) {

        messageBox =
            document.createElement("div");

        messageBox.id =
            "reset-message";

        const card =
            document.querySelector(".login-card");

        card.insertBefore(
            messageBox,
            resetButton
        );
    }


    messageBox.textContent =
        message;

    messageBox.style.margin =
        "15px 0";

    messageBox.style.padding =
        "12px 15px";

    messageBox.style.borderRadius =
        "12px";

    messageBox.style.fontSize =
        "13px";

    messageBox.style.lineHeight =
        "1.5";


    if (type === "success") {

        messageBox.style.background =
            "#eaf7ee";

        messageBox.style.color =
            "#24703b";

    } else {

        messageBox.style.background =
            "#fff0ed";

        messageBox.style.color =
            "#a33728";
    }
}


if (!emailInput || !resetButton) {

    console.error(
        "❌ Champ email ou bouton introuvable."
    );

} else {


    resetButton.addEventListener(
        "click",
        async () => {

            console.log(
                "🖱️ Bouton Envoyer le lien cliqué"
            );


            const email =
                emailInput.value
                    .trim()
                    .toLowerCase();


            console.log(
                "📧 Email saisi :",
                email
            );


            if (!email) {

                showMessage(
                    "Veuillez entrer votre adresse e-mail."
                );

                return;
            }


            if (!emailInput.checkValidity()) {

                showMessage(
                    "Veuillez entrer une adresse e-mail valide."
                );

                return;
            }


            resetButton.disabled =
                true;

            resetButton.innerHTML =
                '<ion-icon name="hourglass-outline"></ion-icon> Envoi...';


            try {

                console.log(
                    "🔥 Envoi de la demande Firebase..."
                );


                await sendPasswordResetEmail(
                    auth,
                    email
                );


                console.log(
                    "✅ EMAIL DE RÉINITIALISATION ENVOYÉ"
                );


                showMessage(
                    "✓ Le lien de réinitialisation a été envoyé. Vérifiez votre boîte de réception et vos spams.",
                    "success"
                );


                resetButton.innerHTML =
                    '<ion-icon name="checkmark-circle-outline"></ion-icon> Lien envoyé';


            } catch (error) {

                console.error(
                    "❌ ERREUR FIREBASE :",
                    error
                );

                console.error(
                    "Code :",
                    error.code
                );

                console.error(
                    "Message :",
                    error.message
                );


                let message =
                    "Une erreur est survenue.";


                switch (error.code) {

                    case "auth/invalid-email":

                        message =
                            "L'adresse e-mail n'est pas valide.";

                        break;


                    case "auth/user-not-found":

                        message =
                            "Aucun compte ne correspond à cette adresse e-mail.";

                        break;


                    case "auth/too-many-requests":

                        message =
                            "Trop de demandes. Veuillez patienter quelques minutes.";

                        break;


                    case "auth/network-request-failed":

                        message =
                            "Problème de connexion à Firebase.";

                        break;


                    case "auth/operation-not-allowed":

                        message =
                            "La connexion par e-mail/mot de passe n'est pas activée dans Firebase.";

                        break;

                }


                showMessage(
                    "❌ " + message
                );


                resetButton.disabled =
                    false;

                resetButton.innerHTML =
                    '<ion-icon name="send-outline"></ion-icon> Envoyer le lien';

            }

        }
    );

}