const CLIENT_ID = process.env.CLIENT_ID;
const SCOPE = process.env.SCOPE;
const REDIRECT_URI = process.env.REDIRECT_URI;

document.getElementById("google-login-btn").addEventListener("click", () => {
    const oauthUrl =
        "https://accounts.google.com/o/oauth2/v2/auth?" +
        `client_id=${CLIENT_ID}` +
        "&response_type=token" +
        `&scope=${SCOPE}` +
        `&redirect_uri=${REDIRECT_URI}` +
        "&prompt=consent";

    window.open(oauthUrl, "_blank", "width=500,height=600");
});
