import admin from 'firebase-admin';

// 1. Firebase Admin SDK Initialization
if (!admin.apps.length) {
    try {
        const serviceAccount = {
            type: "service_account",
            project_id: process.env.FIREBASE_PROJECT_ID || "iskcon-bhuvaikuntha",
            private_key: process.env.FIREBASE_PRIVATE_KEY 
                ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
                : "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDDHmvZu3bV8ttR\nHfcuzyEw6SlGacK+4H7Xe80IKczPkDiICJV2IyG4aQzNb/FIRaqTPsoaOWC1MAoR\nezxN0LvLiy+uNuhIuBjfQVXc2ZPAIpNNMsnaVlL1cH8Cc/yhmgdq/OdIh5EnvW6V\nHWHZssIfS3JYKL7RDQrLb5a2NdQR7YAn4N+9ckiCu5OPPzV+9m+LsNbbMmAX5kUE\nrFX3SWVE6a5/D66SFhy7+JVNcvsf6auq3CPw8vDV4KWq2deed2XZu4yblmE4gAaa\nivGIRCaSn1tmOduv646vXwoaT2jNe/EJatwpBoX1K7xtDLOeoh7Vrsq4IYp4MXMA\neHgF1ndrAgMBAAECggEAOs+ND2wfNf6E127SRdQdu3nTvIr9LX5KDRYeJxM+TeO4\n/luj/R86tzRGrRdMIQ4Ki2Y2EXBw8zvfFQTRmNzM9d1mijq3ic+fg49UW4RjMdra\nDj88MyioyZzWU311TJo6GSfQaH6gJFvHHH/mMfFc7ITXmrXxSd6F/eqNAS+5U4t8\njdE7aBIQ5ynyZ+/xQQUrsLSXtKtTRsHgHIUT6cbB34irWPQGn4HIgA8vqx9kNElb\nJKL4vk1qVoLzR6bVPt2IYtvAaYDYhykneq5AdlqCQTzGQ0A+MvXuHLw2PJtDFAZ4\nVBMCfDZxzkNdSR3zZ+w4NlKkgKAYkFFyxabotacvjQKBgQD30F6P+UduXLXgZ2m1\nnQVzLorjahX6o4DD3KNCkvM0reKmZlzjJB44V4ocCy3OvF1usCXtKID9SZJQ6sMv\ngeSZ3p4snvGCB2UFINNHtMShmvPB5NpxN5ncqo6JFAWaVNaWMTxTGos82szP8bd3\nGjKAZRrIRP6ZTPdZYUK+rq1qzQKBgQDJkG/6Jn/rjpOqkJblJNcngiathvXraW48\nDnT8XUjM61zDA1epLTQLbdZ/mun6X/1VCgdX7IeIsjCknQSckYMNz69WPOUgMp6S\nNJMElO920ZggrMz6ZEF7WJajoR/rFSdI1hqVRlNydhdQa8Pn3ArKXBc4/L+DODm0\nIgreMndbFwKBgQDAuHyB7TP/APy0yter1LSDUgPTPhJfvD4MlA8nXA7lvgEQtXSx\ndMpHuNSAYLU8HMNwrG6iVCiUUl4GrbwjuxmkDDvoqadaHxQR++gz0MJGh7Hf7XFw\nMPRoZv+4XSjKUAYeAaZPXspABkzXvryWVHpH3dkJPJbfc7q8+OWmU0QsVQKBgQC/\niBuPpXPanyHcawan+Ujlhvw/2kXmi8mvEcHCaNYbuu7rdEqhPI3+6kFwAgGh5AKz\nAxOVTfJAR6qHUZknOfJBdn9TQAwte0xI++JT8T5XNrULH4irygabMcP6+sl8th4d\nTS33eNskoehnh++ha+to/PcoNKu7Aft7Gvoex++4wwKBgEx8tITMDOP5eitygvWH\nB0/PXgIwPgt2vrtZGYkMDMDzhBO+CLRVI01Uxea05DftyAU0iBGKsOWGk3cVFG7c\nUnxSpYlHFZfReLu1YZcEAOhjC6gXyRo5idqa4DXPQNIbWhf67siz4b6ax96d+oSz\nEqYw4td6qZMp3BhzofE+aMwq\n-----END PRIVATE KEY-----\n",
            client_email: process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@iskcon-bhuvaikuntha.iam.gserviceaccount.com"
        };
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (e) {
        console.error("Firebase Admin Error:", e);
    }
}

const db = admin.firestore();

// 2. Blogger OAuth2 Access Token Generator using Refresh Token
async function getBloggerAccessToken() {
    const clientId = process.env.BLOGGER_CLIENT_ID;
    const clientSecret = process.env.BLOGGER_CLIENT_SECRET;
    const refreshToken = process.env.BLOGGER_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
        throw new Error("Missing Blogger OAuth credentials in Environment Variables (BLOGGER_CLIENT_ID, BLOGGER_CLIENT_SECRET, BLOGGER_REFRESH_TOKEN)");
    }

    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: "refresh_token"
        })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(`Google OAuth Token Refresh Failed: ${data.error_description || data.error}`);
    }
    return data.access_token;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-admin-secret');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method Not Allowed' });

    try {
        const secretKeyHeader = req.headers['x-admin-secret'];
        const { secretKey, title, imageUrl, quote, quoteSource, quoteType, category, labels, language, isDraft } = req.body || {};

        // Security check
        const validSecret = process.env.ADMIN_SECRET_KEY || "DevDarshanSecret#108";
        if (secretKey !== validSecret && secretKeyHeader !== validSecret) {
            return res.status(401).json({ success: false, error: "Unauthorized: Invalid Security Secret Key" });
        }

        if (!title || !imageUrl) {
            return res.status(400).json({ success: false, error: "Title and Image URL are required" });
        }

        const blogId = process.env.BLOG_ID || "2655100361109264849";
        const contentId = `DD_${Date.now()}`;
        const selectedDeity = category || "Krishna";
        const targetLanguage = language || "Hindi";
        const isScriptural = quoteType === "scriptural";
        const resolvedQuote = quote || "हरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे। हरे राम हरे राम राम राम हरे हरे॥";
        const resolvedSource = isScriptural ? (quoteSource || "Bhagavad Gita As It Is") : "DevDarshan Spiritual Quote";

        // Generate Blogger-compliant HTML body matching your app's exact parser
        const postHtmlContent = `
<div class="separator" style="clear: both; text-align: center;">
  <a href="${imageUrl}" style="margin-left: 1em; margin-right: 1em;">
    <img border="0" src="${imageUrl}" alt="${title}" title="${title}" loading="lazy" />
  </a>
</div>
<div style="text-align: center; margin-top: 15px; font-family: 'Plus Jakarta Sans', sans-serif;">
  <p style="font-size: 16px; font-weight: 700; color: #E5A93C; margin: 0 0 6px 0;">"${resolvedQuote}"</p>
  <p style="font-size: 12px; font-style: italic; color: #94A3B8; margin: 0 0 10px 0;">— ${resolvedSource}</p>
  <p style="font-size: 10px; color: #64748B; letter-spacing: 0.5px;">DevDarshan Content ID: ${contentId} &bull; ${targetLanguage}</p>
</div>
`.trim();

        // Build Labels (Ensures your app categories filter properly)
        const postLabels = Array.isArray(labels) && labels.length > 0 ? labels : [selectedDeity, "Daily Darshan", "4K"];
        if (!postLabels.includes(selectedDeity)) postLabels.push(selectedDeity);
        if (!postLabels.includes("Daily Darshan")) postLabels.push("Daily Darshan");

        // Obtain OAuth token and Post to Blogger API v3
        const accessToken = await getBloggerAccessToken();
        const bloggerApiUrl = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?isDraft=${isDraft === true}`;

        const bloggerPayload = {
            kind: "blogger#post",
            title: title,
            content: postHtmlContent,
            labels: postLabels
        };

        const bloggerRes = await fetch(bloggerApiUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(bloggerPayload)
        });

        const bloggerData = await bloggerRes.json();
        if (!bloggerRes.ok) {
            throw new Error(`Blogger API Error: ${bloggerData.error ? bloggerData.error.message : JSON.stringify(bloggerData)}`);
        }

        // Store History in Firestore to prevent duplicates
        const historyRecord = {
            contentId: contentId,
            bloggerPostId: bloggerData.id || "",
            bloggerUrl: bloggerData.url || "",
            title: title,
            imageUrl: imageUrl,
            quote: resolvedQuote,
            quoteSource: resolvedSource,
            quoteType: isScriptural ? "scriptural" : "inspirational",
            category: selectedDeity,
            labels: postLabels,
            language: targetLanguage,
            isDraft: isDraft === true,
            publishedAt: Date.now()
        };

        await db.collection("wallpaper_history").doc(contentId).set(historyRecord);

        return res.status(200).json({
            success: true,
            message: isDraft ? "Wallpaper saved as Draft on Blogger!" : "🎉 Wallpaper Published Successfully to Blogger & DevDarshan App!",
            contentId: contentId,
            postId: bloggerData.id,
            postUrl: bloggerData.url,
            data: historyRecord
        });

    } catch (error) {
        console.error("Publishing Error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
