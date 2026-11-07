# Sign-in setup: what the owner switches on

2026-11-07. You picked the recommended setup:
- **Delegates and chairs:** the email code, plus Google and Microsoft buttons.
- **Secretariat:** the same sign-in, then an authenticator app. The dashboard locks after 30 minutes with no activity.
- **Everyone:** "Remember me", and a bot check on "Email me a code".

The code is built. Some of it already works on the live site; the rest waits for an account or a secret key that only you can create. **Never paste a secret key into the chat.** Paste secrets only into the Supabase dashboard. The two things you send me are which buttons to turn on and the Turnstile *site* key, which is public.

Supabase project: `phzbbmkeuvjdzvqsnigh`.
Dashboard: https://supabase.com/dashboard/project/phzbbmkeuvjdzvqsnigh

## Already on (nothing to do)

| Piece | What happens |
|---|---|
| Remember me | Ticked: you stay signed in on the device. Unticked: the sign-in ends when you close the tab. The device remembers your choice. |
| Secretariat second step | The first sign-in shows a QR code to scan with Google Authenticator, Microsoft Authenticator or your phone's password app. After that, every sign-in asks for the 6-digit code. The database enforces this (migration `0005_secretariat_mfa.sql`): until the code is entered, a secretariat account can't see or change anything that a delegate account couldn't. |
| 30-minute lock | The secretariat dashboard locks after 30 minutes with no activity and asks for the app code again. Reloading the page doesn't get past the lock. |
| Invite-only secretariat | Nobody can make themselves secretariat. Only a core secretariat member can grant it (Team access page), and the database enforces this. |

**Lost phone:** in Supabase, go to Authentication > Users, open the person, and delete their authenticator factor. They link a new app at their next sign-in.

## 1. Email sender (needed before real sign-ups)

Supabase's built-in email sends only a few codes an hour, which isn't enough for a conference.

1. Create an account with an email service: **Resend** (resend.com) or **Brevo** (brevo.com). Check their current free daily limits.
2. Add a domain you own and add the DNS records the service shows you. A `vercel.app` address can't be used for this, so you need a real domain (the school's, or one bought for DXB MUN).
3. Create an SMTP password or API key in that service.
4. In Supabase, go to **Authentication > Emails > SMTP Settings** and turn on custom SMTP:
   - **Resend:** host `smtp.resend.com`, port `465`, username `resend`, password = the API key.
   - **Sender:** for example `noreply@<your domain>`, name `DXB MUN 2027`.
5. In **Authentication > Emails > Templates > Magic Link**, make sure the email shows the code (`{{ .Token }}`).
6. In **Authentication > Rate Limits**, raise "emails per hour" (you can only change this once custom SMTP is on).
7. In **Authentication > Providers > Email**, set "Email OTP Expiration" to `600` (10 minutes).

## 2. Google button

1. Go to Google Cloud Console (console.cloud.google.com) and create a project called "DXB MUN".
2. Under **APIs & Services > OAuth consent screen**, choose External, app name `DXB MUN 2027`, and add your support email. **Publish** it, otherwise only the test users you list can sign in.
3. Under **Credentials > Create credentials > OAuth client ID**, choose Web application, then add:
   - Authorised JavaScript origin: `https://dxbmun-2027.vercel.app`
   - Authorised redirect URI: `https://phzbbmkeuvjdzvqsnigh.supabase.co/auth/v1/callback`
4. In Supabase, go to **Authentication > Sign In / Providers > Google**, turn it on, and paste the Client ID and Client secret.
5. Tell me **"Google done"**. I then turn the button on and redeploy.

## 3. Microsoft button

1. Go to entra.microsoft.com, then **App registrations > New registration**.
   - Name: `DXB MUN 2027`.
   - Account types: "Any organizational directory and personal Microsoft accounts".
   - Redirect URI (Web): `https://phzbbmkeuvjdzvqsnigh.supabase.co/auth/v1/callback`.
2. Under **Certificates & secrets > New client secret**, copy the secret's **Value** (it is shown only once).
3. Under **Token configuration > Add optional claim**, choose ID token and add `xms_edov`. This proves the email is verified, so nobody can claim someone else's address.
4. In Supabase, go to **Authentication > Sign In / Providers > Azure**, turn it on, and paste the Application (client) ID and the secret Value. Leave the tenant URL empty.
5. Tell me **"Microsoft done"**. I then turn the button on and redeploy.

## 4. Bot check (Cloudflare Turnstile)

The order matters. If Supabase starts asking for the check before the site sends it, nobody can get a code.

1. In the Cloudflare dashboard (free account), go to **Turnstile > Add widget**.
   - Hostnames: `dxbmun-2027.vercel.app` (and `localhost` for testing).
   - Mode: Managed.
2. Send me the **site key**. It's public and appears in the page. I add it and redeploy.
3. Only after I confirm the redeploy: in Supabase, go to **Authentication > Attack Protection > Enable CAPTCHA protection**, choose Turnstile, and paste the **secret key**.

## 5. Redirect address (needed for Google and Microsoft)

In Supabase, go to **Authentication > URL Configuration**:
- Site URL: `https://dxbmun-2027.vercel.app`
- Redirect URLs: add `https://dxbmun-2027.vercel.app/**`

## Where it lives in the code

- **Sign-in screen:** `portal/screens/SignIn.tsx` (buttons, Remember me, bot check).
- **Second step and the 30-minute lock:** `portal/screens/SecondStep.tsx`.
- **Supabase calls:** `src/platform/v2/supabase-core.ts` (`makeAuth`).
- **Sample-data version:** `demo-common.ts`. Demo authenticator code: `123456`.
- **Switches** in `site/.env.live` (public values only):
  - `VITE_AUTH_PROVIDERS=google,microsoft`
  - `VITE_TURNSTILE_SITE_KEY=…`
- **Database rule:** `supabase/migrations/0005_secretariat_mfa.sql`.
